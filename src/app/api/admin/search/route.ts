import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({
        users: [],
        tracks: [],
        artists: [],
        playlists: [],
      });
    }

    const takeCount = 10;

    // Parallel fetch for Admin Search allowing sensitive fields
    const [users, tracks, artists, playlists] = await Promise.all([
      prisma.user.findMany({
        where: {
          username: {
            contains: query,
          },
        },
        take: takeCount,
        orderBy: { createdAt: "desc" },
        // Select specific fields to return the user's details needed for admin
        select: {
          id: true,
          username: true,
          createdAt: true,
          // If you ever add `isBanned` to the Prisma schema, include it here.
          // isBanned: true,
        },
      }),

      prisma.track.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { album: { contains: query } },
          ],
        },
        take: takeCount,
        orderBy: { createdAt: "desc" },
        include: {
          artists: true,
          user: { select: { username: true } },
        },
      }),

      prisma.artist.findMany({
        where: {
          name: { contains: query },
        },
        take: takeCount,
        orderBy: { createdAt: "desc" },
      }),

      prisma.playlist.findMany({
        where: {
          name: { contains: query },
        },
        take: takeCount,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { username: true } },
          _count: { select: { tracks: true } },
        },
      }),
    ]);

    return NextResponse.json({
      users,
      tracks,
      artists,
      playlists,
    });
  } catch (error) {
    console.error("Admin Search error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}