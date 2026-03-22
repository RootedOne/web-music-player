import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

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

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const coverFile = formData.get("coverFile") as File | null;

    let coverUrl = playlist.coverUrl;

    if (coverFile && coverFile.size > 0) {
      const arrayBuffer = await coverFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadDir = path.join(process.cwd(), "public/uploads");
      const picUniqueId = crypto.randomBytes(16).toString("hex");
      const ext = path.extname(coverFile.name).toLowerCase() || '.jpg';
      const picFilename = `playlist_cover_${picUniqueId}${ext}`;
      const picFilepath = path.join(uploadDir, picFilename);

      await fs.writeFile(picFilepath, buffer);
      coverUrl = `/uploads/${picFilename}`;
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