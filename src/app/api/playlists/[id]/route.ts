import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlistId = params.id;

    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== session.user.id) {
        return NextResponse.json({ error: "Playlist not found or forbidden" }, { status: 403 });
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    return NextResponse.json({ message: "Playlist deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const playlist = await prisma.playlist.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { username: true } },
                tracks: {
                    include: {
                        track: true
                    },
                    orderBy: {
                        addedAt: 'asc'
                    }
                }
            }
        });

        if (!playlist) {
            return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
        }

        return NextResponse.json(playlist, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch playlist" }, { status: 500 });
    }
}