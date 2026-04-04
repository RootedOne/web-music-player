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

    const tracks = await prisma.track.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        artists: { select: { id: true, name: true } },
        user: { select: { username: true } },
      },
    });

    // If a specific ID was requested, ensure it's in the list
    if (requestedId && !tracks.find(t => t.id === requestedId)) {
      const specificTrack = await prisma.track.findUnique({
        where: { id: requestedId },
        include: {
          artists: { select: { id: true, name: true } },
          user: { select: { username: true } },
        },
      });

      if (specificTrack) {
        tracks.unshift(specificTrack);
      }
    }

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Failed to fetch tracks:", error);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, title, album, artistId, coverUrl } = body;

    if (!id || !title || !artistId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const currentTrack = await prisma.track.findUnique({
      where: { id },
      include: { artists: true }
    });

    if (!currentTrack) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    let newCoverUrl = currentTrack.coverUrl;

    if (coverUrl !== undefined && coverUrl !== currentTrack.coverUrl) {
       newCoverUrl = coverUrl;
       await deleteFileSafely(currentTrack.coverUrl);
    }

    // Update track with new text fields, new coverUrl, and connect new artist via set
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        title,
        album,
        coverUrl: newCoverUrl,
        artists: {
          set: [{ id: artistId }],
        },
      },
      include: {
        artists: { select: { id: true, name: true } },
        user: { select: { username: true } },
      },
    });

    return NextResponse.json(updatedTrack);
  } catch (error) {
    console.error("Failed to update track:", error);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    }

    const currentTrack = await prisma.track.findUnique({
      where: { id },
    });

    if (!currentTrack) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Critical: Delete both Audio File and Cover Image File
    await deleteFileSafely(currentTrack.fileUrl);
    await deleteFileSafely(currentTrack.coverUrl);

    // Prisma handles deleting relational PlaylistTrack records via onDelete: Cascade
    await prisma.track.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete track:", error);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}