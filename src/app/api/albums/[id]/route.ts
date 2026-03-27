import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decodedName = decodeURIComponent(params.id);

    const tracks = await prisma.track.findMany({
      where: {
        album: decodedName,
      },
      include: {
        user: { select: { username: true } },
        artists: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (tracks.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const albumObj = {
      id: decodedName,
      name: decodedName,
      artist: tracks.find((t) => t.artist)?.artist || "Unknown Artist",
      imageUrl: tracks.find((t) => t.coverUrl)?.coverUrl || null,
      tracks,
    };

    return NextResponse.json(albumObj, { status: 200 });
  } catch (error) {
    console.error("Fetch Album Error:", error);
    return NextResponse.json({ error: "Failed to fetch album" }, { status: 500 });
  }
}
