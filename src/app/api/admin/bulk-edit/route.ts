import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, entity, field, searchString, replaceString, isRegex, isCaseSensitive, updates } = body;

    // Validate entity and field to prevent SQL injection or bad generic access
    const allowedEntities = ["Track", "Artist", "Playlist"];
    const allowedFields = {
      Track: ["title", "artist", "album"], // artist is the legacy string field
      Artist: ["name"],
      Playlist: ["name", "description"]
    };

    if (!allowedEntities.includes(entity)) {
      return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }

    if (!allowedFields[entity as keyof typeof allowedFields].includes(field)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    if (action === "preview") {
      if (typeof searchString !== "string" || typeof replaceString !== "string") {
         return NextResponse.json({ error: "Invalid search or replace strings" }, { status: 400 });
      }

      const safeSearch = searchString;
      const safeReplace = replaceString;

      // Because Prisma does not support RegExp native queries in SQLite, and `contains` mode:'insensitive' is also not supported natively by Prisma for SQLite natively in a simple way, we can fetch all or a large chunk and filter.
      // We cannot use `{ not: null }` on fields that are required (like Artist.name or Track.title),
      // as Prisma will throw a validation error. Instead, we use a simpler approach.

      let records: { id: string, [key: string]: string | null }[] = [];

      if (!isRegex && !isCaseSensitive && safeSearch !== "") {
        // We can optimize non-regex case-insensitive with Prisma 'contains'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records = await (prisma as any)[entity.toLowerCase()].findMany({
          where: {
            [field]: {
               contains: safeSearch,
            }
          },
          select: {
            id: true,
            [field]: true,
          }
        });
      } else {
        // Fetch all and filter in JS for regex or strict case sensitivity, or empty search strings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records = await (prisma as any)[entity.toLowerCase()].findMany({
          where: {}, // Empty where clause fetches all records
          select: {
            id: true,
            [field]: true,
          }
        });
      }

      const results = [];
      let regex: RegExp;

      if (isRegex) {
        try {
          regex = new RegExp(safeSearch, isCaseSensitive ? "g" : "gi");
        } catch {
          return NextResponse.json({ error: "Invalid Regular Expression" }, { status: 400 });
        }
      }

      for (const record of records) {
        const originalValue = record[field];
        if (typeof originalValue !== "string") continue;

        let match = false;
        let newValue = originalValue;

        if (isRegex) {
          if (regex!.test(originalValue)) {
            match = true;
            // Reset lastIndex because test() advances it
            regex!.lastIndex = 0;
            newValue = originalValue.replace(regex!, safeReplace);
          }
        } else {
          if (isCaseSensitive) {
            if (originalValue.includes(safeSearch)) {
              match = true;
              newValue = originalValue.split(safeSearch).join(safeReplace);
            }
          } else {
            // Case-insensitive simple string replacement
            const lowerOriginal = originalValue.toLowerCase();
            const lowerSearch = safeSearch.toLowerCase();
            if (lowerOriginal.includes(lowerSearch)) {
              match = true;
              // Safe case-insensitive replace all
              // We use a regex created from the search string, escaping regex characters
              const escapedSearch = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const replaceRegex = new RegExp(escapedSearch, "gi");
              newValue = originalValue.replace(replaceRegex, safeReplace);
            }
          }
        }

        if (match && newValue !== originalValue) {
          results.push({
            id: record.id,
            originalValue,
            newValue,
          });
        }
      }

      // Auto-Merge Detection for Artist 'name'
      if (entity === "Artist" && field === "name" && results.length > 0) {
        // Fetch all existing artists to build a case-insensitive map.
        // We order by createdAt asc so the oldest (original) artist is chosen as the target if there are duplicates.
        // SQLite doesn't support mode: 'insensitive' in Prisma, and 'in' might be case-sensitive depending on collation.
        // So we fetch all artists (or we could fetch where contains the names, but fetching all artists name/id is fast enough for admin).
        const existingArtists = await prisma.artist.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        const existingNamesMap = new Map();
        for (const artist of existingArtists) {
          const lowerName = artist.name.toLowerCase();
          // Only keep the first (oldest) one we see
          if (!existingNamesMap.has(lowerName)) {
            existingNamesMap.set(lowerName, artist.id);
          }
        }

        for (const result of results) {
          const lowerNewValue = result.newValue.toLowerCase();
          if (existingNamesMap.has(lowerNewValue)) {
            const existingId = existingNamesMap.get(lowerNewValue);
            if (existingId !== result.id) {
              Object.assign(result, {
                isMerge: true,
                mergeMessage: "Will merge into existing artist.",
                targetId: existingId
              });
            }
          }
        }
      }

      return NextResponse.json({ results });
    }

    if (action === "execute") {
      if (!updates || !Array.isArray(updates)) {
        return NextResponse.json({ error: "Invalid updates array" }, { status: 400 });
      }

      let updatedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Execute updates sequentially to gracefully handle unique constraint errors (P2002)
      // without rolling back the entire batch of unrelated updates.
      for (const update of updates) {
        try {
          if (entity === "Artist" && field === "name") {
            // Check if the target name already exists (case-insensitive)
            // SQLite 'contains' is case-insensitive, so we fetch potential targets
            // and filter in memory to find an exact case-insensitive match.
            // Order by createdAt to prefer merging into the oldest record.
            const potentialTargets = await prisma.artist.findMany({
              where: {
                name: {
                  contains: update.newValue
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            });

            const lowerNewValue = update.newValue.toLowerCase();
            const existingTarget = potentialTargets.find(t => t.name.toLowerCase() === lowerNewValue);

            if (existingTarget && existingTarget.id !== update.id) {
              // Auto-Merge Logic
              const sourceArtist = await prisma.artist.findUnique({
                where: { id: update.id },
                include: { tracks: true }
              });

              if (!sourceArtist) {
                throw new Error("Source artist not found.");
              }

              const transaction = [];

              // Move tracks: disconnect from source, connect to target
              if (sourceArtist.tracks.length > 0) {
                const trackIds = sourceArtist.tracks.map(t => ({ id: t.id }));
                transaction.push(
                  prisma.artist.update({
                    where: { id: existingTarget.id },
                    data: {
                      tracks: {
                        connect: trackIds
                      }
                    }
                  })
                );

                // Update legacy artist string on tracks
                transaction.push(
                  prisma.track.updateMany({
                    where: { id: { in: sourceArtist.tracks.map(t => t.id) } },
                    data: { artist: existingTarget.name }
                  })
                );
              }

              // Preserve image if target doesn't have one but source does
              if (!existingTarget.imageUrl && sourceArtist.imageUrl) {
                transaction.push(
                  prisma.artist.update({
                    where: { id: existingTarget.id },
                    data: { imageUrl: sourceArtist.imageUrl }
                  })
                );
              }

              // Delete the source artist
              transaction.push(
                prisma.artist.delete({
                  where: { id: sourceArtist.id }
                })
              );

              // We also need to safely delete files via S3 DeleteObjectCommand in the future if this
              // was fully deleting the artist's resources without moving them, but if we are merging
              // and the source had an image, it is preserved, if they didn't, nothing is lost.

              await prisma.$transaction(transaction);
              updatedCount++;
            } else {
              // Standard update
              await prisma.artist.update({
                where: { id: update.id },
                data: { name: update.newValue }
              });
              updatedCount++;
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma as any)[entity.toLowerCase()].update({
              where: { id: update.id },
              data: { [field]: update.newValue }
            });
            updatedCount++;
          }
        } catch (error) {
          failedCount++;
          // Prisma P2002: Unique constraint failed
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            errors.push(`ID ${update.id} failed: Unique constraint on ${field}.`);
          } else {
            const message = error instanceof Error ? error.message : "Unknown error";
            errors.push(`ID ${update.id} failed: ${message}`);
          }
        }
      }

      return NextResponse.json({
        message: `Successfully updated ${updatedCount} records.` + (failedCount > 0 ? ` Failed ${failedCount} records.` : ""),
        count: updatedCount,
        failedCount,
        errors
      });
    }

  } catch (error) {
    console.error("Bulk edit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}