import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("id");

    const playlists = await prisma.playlist.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        _count: { select: { tracks: true } },
      },
    });

    if (requestedId && !playlists.find((p) => p.id === requestedId)) {
      const specificPlaylist = await prisma.playlist.findUnique({
        where: { id: requestedId },
        include: {
          user: { select: { username: true } },
          _count: { select: { tracks: true } },
        },
      });

      if (specificPlaylist) {
        playlists.unshift(specificPlaylist);
      }
    }

    return NextResponse.json(playlists);
  } catch (error) {
    console.error("Failed to fetch playlists:", error);
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        user: { select: { username: true } },
        _count: { select: { tracks: true } },
      },
    });

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error("Failed to update playlist:", error);
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
    }

    // Rely on Prisma's onDelete: Cascade for related PlaylistTrack and SavedPlaylist records
    await prisma.playlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete playlist:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}