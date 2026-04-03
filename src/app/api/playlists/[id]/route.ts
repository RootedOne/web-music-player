import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteS3File } from "@/lib/s3";

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

    if (playlist.coverUrl) {
      await deleteS3File(playlist.coverUrl);
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
        const session = await getServerSession(authOptions);

        const playlist = await prisma.playlist.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { username: true } },
                savedBy: session?.user?.id ? {
                    where: { userId: session.user.id }
                } : false,
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlistId = params.id;
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });

    if (!playlist || playlist.userId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, coverUrl: newCoverUrl } = await req.json();

    let coverUrl = playlist.coverUrl;

    if (newCoverUrl !== undefined) {
      if (playlist.coverUrl && playlist.coverUrl !== newCoverUrl) {
        await deleteS3File(playlist.coverUrl);
      }
      coverUrl = newCoverUrl;
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        name: name || playlist.name,
        coverUrl,
      },
    });

    return NextResponse.json(updatedPlaylist, { status: 200 });
  } catch (error) {
    console.error("Edit playlist error:", error);
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}