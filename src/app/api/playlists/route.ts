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

    const playlists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { tracks: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(playlists, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}
