import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteS3File } from "@/lib/s3";

function extractS3Key(url: string | null) {
  if (!url) return null;
  // Assumes URLs are of format https://.../bucket/key
  // Or path-style logic that was asked: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${key}`
  // Let's just find the part after the bucket name or simply find tracks/ or covers/ prefix
  const parts = url.split('/');
  // To be safe, look for 'tracks/' or 'covers/' index
  const prefixIndex = parts.findIndex(p => p === 'tracks' || p === 'covers');
  if (prefixIndex !== -1) {
    return parts.slice(prefixIndex).join('/');
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json(track, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch track" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trackId = params.id;
    const track = await prisma.track.findUnique({ where: { id: trackId } });

    if (!track || track.userId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, artist, album, coverUrl } = body;

    if (coverUrl && track.coverUrl && track.coverUrl !== coverUrl) {
      // Delete old cover from S3
      const oldKey = extractS3Key(track.coverUrl);
      if (oldKey) {
        await deleteS3File(oldKey);
      }
    }

    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        title: title || track.title,
        artist: artist !== undefined ? artist : track.artist,
        album: album !== undefined ? album : track.album,
        coverUrl: coverUrl !== undefined ? coverUrl : track.coverUrl,
      },
    });

    return NextResponse.json(updatedTrack, { status: 200 });
  } catch (error) {
    console.error("Edit track error:", error);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trackId = params.id;
    const track = await prisma.track.findUnique({ where: { id: trackId } });

    if (!track || track.userId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (track.fileUrl) {
      const trackKey = extractS3Key(track.fileUrl);
      if (trackKey) await deleteS3File(trackKey);
    }

    if (track.coverUrl) {
      const coverKey = extractS3Key(track.coverUrl);
      if (coverKey) await deleteS3File(coverKey);
    }

    await prisma.track.delete({
      where: { id: trackId },
    });

    return NextResponse.json({ message: "Track deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete track error:", error);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}
