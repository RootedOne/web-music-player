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
    const body = await req.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json({ error: "Track ID is required" }, { status: 400 });
    }

    // Verify ownership
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== session.user.id) {
      return NextResponse.json({ error: "Playlist not found or forbidden" }, { status: 403 });
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.userId !== session.user.id) {
      return NextResponse.json({ error: "Track not found or forbidden" }, { status: 403 });
    }

    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
      },
    });

    return NextResponse.json(playlistTrack, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
        return NextResponse.json({ error: "Track already in playlist" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add track to playlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const playlistId = params.id;
        const body = await req.json();
        const { trackId } = body;

        if (!trackId) {
            return NextResponse.json({ error: "Track ID is required" }, { status: 400 });
        }

        // Verify playlist ownership
        const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
        if (!playlist || playlist.userId !== session.user.id) {
            return NextResponse.json({ error: "Playlist not found or forbidden" }, { status: 403 });
        }

        await prisma.playlistTrack.delete({
            where: {
                playlistId_trackId: {
                    playlistId,
                    trackId,
                },
            },
        });

        return NextResponse.json({ message: "Track removed from playlist" }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to remove track" }, { status: 500 });
    }
}
