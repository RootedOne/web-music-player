import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function deleteFileSafely(fileUrl: string | null) {
  if (!fileUrl) return;
  // Assumes fileUrl is like /uploads/custom_cover_123.jpg
  // Only delete files in /uploads to prevent path traversal
  if (!fileUrl.startsWith("/uploads/")) return;

  try {
    const filePath = path.join(process.cwd(), "public", fileUrl);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete old file: ${fileUrl}`, error);
    // Do not crash the API
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
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const imageFile = formData.get("image") as File | null;

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
        // Wait for approval for Step 2 (fs.unlink) and Step 3 (frontend UI update).

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

        // Step 2: File System Cleanup
        // Safely delete the source artist's cover image ONLY AFTER the database transaction succeeds
        await deleteFileSafely(currentArtist.imageUrl);

        // For now, return a placeholder merged flag (Step 3 will handle this fully)
        return NextResponse.json({ merged: true, targetId: targetArtist.id });
      }
    }

    let newImageUrl = currentArtist.imageUrl;

    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `artist_cover_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, buffer);

      newImageUrl = `/uploads/${fileName}`;

      // Safely delete old image
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