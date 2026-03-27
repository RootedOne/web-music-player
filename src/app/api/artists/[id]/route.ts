import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decodedParam = decodeURIComponent(params.id);

    // Try to find the artist by ID first, then fallback to legacy name
    const artistRecord = await prisma.artist.findFirst({
      where: {
        OR: [
          { id: decodedParam },
          { name: decodedParam }
        ]
      },
      include: {
        tracks: {
          include: {
            user: { select: { username: true } },
            artists: true,
          },
          orderBy: { createdAt: "desc" },
        }
      }
    });

    if (artistRecord) {
        return NextResponse.json({
            id: artistRecord.id,
            name: artistRecord.name,
            imageUrl: artistRecord.imageUrl || artistRecord.tracks.find((t) => t.coverUrl)?.coverUrl || null,
            tracks: artistRecord.tracks
        }, { status: 200 });
    }

    // Fallback: If no Artist model exists yet (legacy data), search the raw string field
    const tracks = await prisma.track.findMany({
      where: {
        artist: decodedParam,
      },
      include: {
        user: { select: { username: true } },
        artists: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (tracks.length === 0) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistObj = {
      id: decodedParam,
      name: decodedParam,
      imageUrl: tracks.find((t) => t.coverUrl)?.coverUrl || null,
      tracks,
    };

    return NextResponse.json(artistObj, { status: 200 });
  } catch (error) {
    console.error("Fetch Artist Error:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
