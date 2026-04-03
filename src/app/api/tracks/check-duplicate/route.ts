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

    const { title, artist } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Deduplication / Fuzzy Match Check
    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = normalizeString(title);
    const normArtist = normalizeString(artist || "Unknown Artist");

    const existingTracks = await prisma.track.findMany({
      where: { userId: session.user.id as string },
      select: { title: true, artist: true }
    });

    const isDuplicate = existingTracks.some(t =>
      normalizeString(t.title) === normTitle &&
      normalizeString(t.artist || "Unknown Artist") === normArtist
    );

    if (isDuplicate) {
      return NextResponse.json(
        { isDuplicate: true, message: "A track with this title and artist already exists in your library." },
        { status: 200 }
      );
    }

    return NextResponse.json({ isDuplicate: false }, { status: 200 });
  } catch (error) {
    console.error("Duplicate Check Error:", error);
    return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 });
  }
}
