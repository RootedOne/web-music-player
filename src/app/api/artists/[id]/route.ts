import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const artistId = params.id;

    if (!artistId) {
      return NextResponse.json({ error: "Artist ID is required" }, { status: 400 });
    }

    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        tracks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json(artist, { status: 200 });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
