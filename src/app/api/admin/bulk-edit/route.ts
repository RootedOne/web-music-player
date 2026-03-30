import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, entity, field, search, replace, isRegex, isCaseSensitive, updates } = body;

    // Validate inputs
    if (!action || !["preview", "execute"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!entity || !["Track", "Artist", "Playlist"].includes(entity)) {
      return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }

    const validFields: Record<string, string[]> = {
      Track: ["title", "album"], // 'album' is a string field on Track
      Artist: ["name"],
      Playlist: ["name", "description"],
    };

    if (!field || !validFields[entity].includes(field)) {
      return NextResponse.json({ error: "Invalid field for entity" }, { status: 400 });
    }

    if (action === "preview") {
      if (!search && !isRegex) {
         return NextResponse.json({ error: "Search term is required" }, { status: 400 });
      }

      // Fetch all potentially matching records
      // SQLite does not support native case-insensitive LIKE/contains without extra configuration,
      // and it doesn't support regex natively. So we fetch and filter in Node.js.
      // To prevent fetching huge datasets, we try a simple LIKE if it's not a regex and it's case-insensitive (sqlite default)
      // Actually, Prisma SQLite 'contains' is case-insensitive by default in dev/sqlite.
      // But since we need case-sensitive or regex logic, we might have to fetch a wider net or do it in JS.
      // To be safe and since this is admin functionality, we can fetch all or a large chunk and filter.
      // Let's use Prisma to fetch all records where the field is not null.

      let records: { id: string, [key: string]: string | null }[] = [];

      if (!isRegex && !isCaseSensitive) {
        // We can optimize non-regex case-insensitive with Prisma 'contains'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records = await (prisma as any)[entity.toLowerCase()].findMany({
          where: {
            [field]: {
               contains: search,
               // mode: 'insensitive' is not supported in SQLite, but default is case-insensitive for ASCII.
            }
          },
          select: {
            id: true,
            [field]: true,
          }
        });
      } else {
        // Fetch all non-null for this field and filter in JS for regex or strict case sensitivity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records = await (prisma as any)[entity.toLowerCase()].findMany({
          where: {
            [field]: {
              not: null
            }
          },
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
          regex = new RegExp(search, isCaseSensitive ? "g" : "gi");
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
            newValue = originalValue.replace(regex!, replace || "");
          }
        } else {
          if (isCaseSensitive) {
            if (originalValue.includes(search)) {
              match = true;
              newValue = originalValue.split(search).join(replace || "");
            }
          } else {
            // Case-insensitive simple string replacement
            const lowerOriginal = originalValue.toLowerCase();
            const lowerSearch = search.toLowerCase();
            if (lowerOriginal.includes(lowerSearch)) {
              match = true;
              // Safe case-insensitive replace all
              // We use a regex created from the search string, escaping regex characters
              const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const replaceRegex = new RegExp(escapedSearch, "gi");
              newValue = originalValue.replace(replaceRegex, replace || "");
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

      // Conflict Detection for Artist 'name'
      if (entity === "Artist" && field === "name" && results.length > 0) {
        const proposedNames = results.map(r => r.newValue);
        const existingArtists = await prisma.artist.findMany({
          where: {
            name: {
              in: proposedNames
            }
          },
          select: {
            id: true,
            name: true,
          }
        });

        const existingNamesMap = new Map(existingArtists.map(a => [a.name.toLowerCase(), a.id]));

        for (const result of results) {
          const lowerNewValue = result.newValue.toLowerCase();
          if (existingNamesMap.has(lowerNewValue)) {
            const existingId = existingNamesMap.get(lowerNewValue);
            if (existingId !== result.id) {
              // We'll define results loosely to accept these new keys in JS
              // using Object.assign or direct assignment since results is typed loosely
              Object.assign(result, {
                hasConflict: true,
                conflictMessage: "Artist name already exists.",
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any)[entity.toLowerCase()].update({
            where: { id: update.id },
            data: { [field]: update.newValue }
          });
          updatedCount++;
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