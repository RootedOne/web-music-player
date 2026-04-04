import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteS3File } from "@/lib/s3";

export const dynamic = "force-dynamic";

function extractS3Key(url: string | null) {
  if (!url) return null;
  const parts = url.split('/');
  const prefixIndex = parts.findIndex(p => p === 'tracks' || p === 'covers');
  if (prefixIndex !== -1) {
    return parts.slice(prefixIndex).join('/');
  }
  return null;
}

async function deleteFileSafely(fileUrl: string | null) {
  if (!fileUrl) return;
  const s3Key = extractS3Key(fileUrl);
  if (s3Key) {
    await deleteS3File(s3Key);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("id");

    const artists = await prisma.artist.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tracks: true } },
      },
    });

    if (requestedId && !artists.find((a) => a.id === requestedId)) {
      const specificArtist = await prisma.artist.findUnique({
        where: { id: requestedId },
        include: {
          _count: { select: { tracks: true } },
        },
      });

      if (specificArtist) {
        artists.unshift(specificArtist);
      }
    }

    return NextResponse.json(artists);
  } catch (error) {
    console.error("Failed to fetch artists:", error);
    return NextResponse.json({ error: "Failed to fetch artists" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, imageUrl } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const currentArtist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!currentArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Check if we are renaming to an artist that already exists (Merging Scenario)
    if (name !== currentArtist.name) {
      const targetArtist = await prisma.artist.findUnique({
        where: { name },
      });

      if (targetArtist) {
        // Step 1: Atomic Database Transaction
        // Re-assign all tracks from the source artist to the target artist, then delete the source artist.
        const tracksToMove = await prisma.track.findMany({
          where: { artists: { some: { id: currentArtist.id } } },
          select: { id: true }
        });

        await prisma.$transaction([
          ...tracksToMove.map((track) =>
            prisma.track.update({
              where: { id: track.id },
              data: {
                artists: {
                  disconnect: { id: currentArtist.id },
                  connect: { id: targetArtist.id }
                }
              }
            })
          ),
          // Delete the old source artist atomically at the end of the transaction
          prisma.artist.delete({
            where: { id: currentArtist.id }
          })
        ]);

        // Step 2: Reference Counting & File System Cleanup
        let totalReferences = 0;

        if (currentArtist.imageUrl) {
          const [trackUsages, artistUsages] = await Promise.all([
            prisma.track.count({
              where: { coverUrl: currentArtist.imageUrl }
            }),
            prisma.artist.count({
              where: {
                imageUrl: currentArtist.imageUrl,
                id: { not: currentArtist.id }
              }
            })
          ]);

          totalReferences = trackUsages + artistUsages;
        }

        // Safely delete the source artist's cover image ONLY AFTER the database transaction succeeds
        // and only if no other records are actively using the physical file.
        if (totalReferences === 0) {
          await deleteFileSafely(currentArtist.imageUrl);
        } else {
          console.log(`Skipped file deletion: Image still referenced by ${totalReferences} records.`);
        }

        // Return a placeholder merged flag
        return NextResponse.json({ merged: true, targetId: targetArtist.id });
      }
    }

    let newImageUrl = currentArtist.imageUrl;

    if (imageUrl !== undefined && imageUrl !== currentArtist.imageUrl) {
      newImageUrl = imageUrl;
      await deleteFileSafely(currentArtist.imageUrl);
    }

    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: {
        name,
        imageUrl: newImageUrl,
      },
      include: {
        _count: { select: { tracks: true } },
      },
    });

    return NextResponse.json(updatedArtist);
  } catch (error) {
    console.error("Failed to update artist:", error);
    return NextResponse.json({ error: "Failed to update artist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing artist ID" }, { status: 400 });
    }

    const currentArtist = await prisma.artist.findUnique({
      where: { id },
      include: {
        _count: { select: { tracks: true } },
      },
    });

    if (!currentArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    if (currentArtist._count.tracks > 0) {
      return NextResponse.json(
        { error: "Cannot delete artist because they still have linked tracks. Please re-assign or delete the tracks first." },
        { status: 400 }
      );
    }

    // Safely delete image
    await deleteFileSafely(currentArtist.imageUrl);

    await prisma.artist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete artist:", error);
    return NextResponse.json({ error: "Failed to delete artist" }, { status: 500 });
  }
}