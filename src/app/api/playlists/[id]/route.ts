import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteS3File } from "@/lib/s3";

function extractS3Key(url: string | null) {
  if (!url) return null;
  const parts = url.split('/');
  const prefixIndex = parts.findIndex(p => p === 'tracks' || p === 'covers');
  if (prefixIndex !== -1) {
    return parts.slice(prefixIndex).join('/');
  }
  return null;
}

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
      const coverKey = extractS3Key(playlist.coverUrl);
      if (coverKey) {
        await deleteS3File(coverKey);
      }
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

    const body = await req.json();
    const { name, coverUrl } = body;

    if (coverUrl && playlist.coverUrl && playlist.coverUrl !== coverUrl) {
      const oldKey = extractS3Key(playlist.coverUrl);
      if (oldKey) {
        await deleteS3File(oldKey);
      }
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        name: name || playlist.name,
        coverUrl: coverUrl !== undefined ? coverUrl : playlist.coverUrl,
      },
    });

    return NextResponse.json(updatedPlaylist, { status: 200 });
  } catch (error) {
    console.error("Edit playlist error:", error);
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}