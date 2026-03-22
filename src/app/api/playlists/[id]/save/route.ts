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

    // Check if playlist exists
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId === userId) {
        return NextResponse.json({ error: "Cannot save your own playlist" }, { status: 400 });
    }

    // Try to create the saved record (fails gracefully if it already exists due to unique constraint)
    const saved = await prisma.savedPlaylist.create({
        data: {
            userId,
            playlistId
        }
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
          return NextResponse.json({ error: "Playlist already saved" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to save playlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const playlistId = params.id;
        const userId = session.user.id;

        await prisma.savedPlaylist.delete({
            where: {
                userId_playlistId: {
                    userId,
                    playlistId
                }
            }
        });

        return NextResponse.json({ message: "Playlist unsaved" }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to unsave playlist" }, { status: 500 });
    }
}
