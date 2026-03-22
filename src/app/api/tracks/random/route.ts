import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure random is re-evaluated on every fetch

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // SQLite RANDOM() function allows us to order randomly natively
    // We use Prisma's $queryRaw to perform this efficiently for SQLite
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const randomTracksRaw = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM Track
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;

    if (!randomTracksRaw.length) {
      return NextResponse.json({ tracks: [] }, { status: 200 });
    }

    const trackIds = randomTracksRaw.map((t) => t.id);

    // Fetch the full rich track models based on the random IDs
    const tracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
      },
      include: {
        user: { select: { username: true } },
      },
    });

    // findMany with 'in' doesn't guarantee the order of 'trackIds',
    // so we re-sort them based on the randomized IDs array.
    const randomizedTracks = tracks.sort((a, b) => trackIds.indexOf(a.id) - trackIds.indexOf(b.id));

    return NextResponse.json({ tracks: randomizedTracks }, { status: 200 });
  } catch (error) {
    console.error("Fetch Random Tracks Error:", error);
    return NextResponse.json({ error: "Failed to fetch random tracks" }, { status: 500 });
  }
}
