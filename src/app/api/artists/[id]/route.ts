import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const artistId = params.id;

    if (!artistId) {
      return NextResponse.json({ error: "Artist ID is required" }, { status: 400 });
    }

    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        tracks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const topSongs = artist.tracks.slice(0, 5);

    // Grouping by Album (excluding singles and empty albums)
    const albumMap = new Map();
    for (const track of artist.tracks) {
      const albumName = track.album || "Unknown Album";
      if (albumName === "Single" || albumName === "Unknown Album") continue;

      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          albumName: albumName,
          releaseYear: track.createdAt ? new Date(track.createdAt).getFullYear() : "",
          coverUrl: track.coverUrl || null,
        });
      }
    }

    const albums = Array.from(albumMap.values());

    return NextResponse.json({
      ...artist,
      topSongs,
      albums,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
