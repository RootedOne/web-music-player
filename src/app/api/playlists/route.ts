import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        userId: session.user.id as string,
      },
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch playlists created by user
    const createdPlaylists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: { select: { tracks: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch playlists saved by user
    const savedPlaylistsRaw = await prisma.savedPlaylist.findMany({
      where: { userId },
      include: {
        playlist: {
          include: {
            _count: { select: { tracks: true } }
          }
        }
      },
      orderBy: { savedAt: "desc" },
    });

    const savedPlaylists = savedPlaylistsRaw.map(sp => sp.playlist);

    // Combine and remove exact duplicates just in case
    const allPlaylists = [...createdPlaylists, ...savedPlaylists];
    const uniquePlaylists = Array.from(new Map(allPlaylists.map(item => [item.id, item])).values());

    return NextResponse.json(uniquePlaylists, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}
