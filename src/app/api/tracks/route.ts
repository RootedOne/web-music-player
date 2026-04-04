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

    const { title, artist, album, duration, fileUrl, coverUrl } = await req.json();

    if (!title || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const finalArtist = artist || "Unknown Artist";
    const finalAlbum = album || "Unknown Album";

    // 1. String Parsing (The Split)
    const rawArtistString = finalArtist;
    // Split on commas, ampersands, and keywords: feat., ft., featuring, x, X
    const artistNames = rawArtistString
      .split(/,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+[xX]\s+/i)
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0);

    // 2. Multi-Upsert Loop
    const artistRecords = await Promise.all(
      artistNames.map(async (name: string) => {
        return prisma.artist.upsert({
          where: { name },
          update: {
            // Update the image if the current track has a cover and the artist doesn't
            ...(coverUrl ? { imageUrl: coverUrl } : {}),
          },
          create: {
            name,
            imageUrl: coverUrl,
          },
        });
      })
    );

    const track = await prisma.track.create({
      data: {
        title,
        artist: finalArtist, // Keep legacy string for backward compatibility
        album: finalAlbum,
        duration: duration || 0,
        fileUrl,
        coverUrl,
        userId: session.user.id as string,
        artists: {
          connect: artistRecords.map((a) => ({ id: a.id })),
        },
      },
      include: {
        artists: true,
      },
    });

    return NextResponse.json({ message: "Upload successful", track }, { status: 201 });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'global';
    const searchQuery = searchParams.get('search') || '';
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const session = await getServerSession(authOptions);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (filter === 'personal') {
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        whereClause.userId = session.user.id;
    }

    if (searchQuery) {
        whereClause.OR = [
            { title: { contains: searchQuery } },
            { artist: { contains: searchQuery } }
        ];
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      take: limit + 1, // Fetch an extra track to see if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor itself
      include: {
        user: { select: { username: true } },
        artists: true,
      },
      // Use stable sort to prevent duplicates or jumping during pagination
      orderBy: [
         { createdAt: "desc" },
         { id: "desc" }
      ],
    });

    let nextCursor: string | null = null;
    if (tracks.length > limit) {
      const nextItem = tracks.pop(); // Remove the extra item
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({ tracks, nextCursor }, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}
