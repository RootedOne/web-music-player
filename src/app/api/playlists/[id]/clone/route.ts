import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlistId = params.id;
    const userId = session.user.id;

    // Check if playlist exists and load its tracks
    const originalPlaylist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: true,
      },
    });

    if (!originalPlaylist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Deep clone the playlist
    const clonedPlaylist = await prisma.playlist.create({
      data: {
        name: `${originalPlaylist.name} (Copy)`,
        userId,
        coverUrl: originalPlaylist.coverUrl,
        tracks: {
          create: originalPlaylist.tracks.map((pt) => ({
            trackId: pt.trackId,
          })),
        },
      },
    });

    return NextResponse.json(clonedPlaylist, { status: 201 });
  } catch (error: unknown) {
    console.error("Clone Playlist Error:", error);
    return NextResponse.json({ error: "Failed to clone playlist" }, { status: 500 });
  }
}
