import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ensure this route is evaluated dynamically, handling dynamic search params gracefully.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json([], { status: 200 });
    }

    const artists = await prisma.artist.findMany();
    const lowerQ = q.toLowerCase();
    const matchedArtists = artists.filter(a => a.name.toLowerCase().includes(lowerQ));

    return NextResponse.json(matchedArtists, { status: 200 });
  } catch (error) {
    console.error("Error searching artists:", error);
    return NextResponse.json({ error: "Failed to search artists" }, { status: 500 });
  }
}
