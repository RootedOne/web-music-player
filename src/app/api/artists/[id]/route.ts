import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decodedName = decodeURIComponent(params.id);

    const tracks = await prisma.track.findMany({
      where: {
        artist: decodedName,
      },
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (tracks.length === 0) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistObj = {
      id: decodedName,
      name: decodedName,
      imageUrl: tracks.find((t) => t.coverUrl)?.coverUrl || null,
      tracks,
    };

    return NextResponse.json(artistObj, { status: 200 });
  } catch (error) {
    console.error("Fetch Artist Error:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
