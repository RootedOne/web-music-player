import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as mm from "music-metadata";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validTypes = ["audio/mpeg", "audio/wav", "audio/x-wav"];
    const ext = path.extname(file.name).toLowerCase();

    if (!validTypes.includes(file.type) && ext !== ".mp3" && ext !== ".wav") {
      return NextResponse.json(
        { error: "Invalid file type. Only MP3 and WAV are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uniqueId = crypto.randomBytes(16).toString("hex");
    const filename = `${uniqueId}${ext}`;

    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);

    let title = path.basename(file.name, ext);
    let artist = "Unknown Artist";
    let album = "Unknown Album";
    let duration = 0;
    let coverUrl = null;

    try {
      const metadata = await mm.parseBuffer(buffer, file.type);
      if (metadata.common.title) title = metadata.common.title;
      if (metadata.common.artist) artist = metadata.common.artist;
      if (metadata.common.album) album = metadata.common.album;
      if (metadata.format.duration) duration = metadata.format.duration;

      // Extract Cover Art
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const picUniqueId = crypto.randomBytes(16).toString("hex");
        const picExt = picture.format === 'image/png' ? '.png' : '.jpg';
        const picFilename = `cover_${picUniqueId}${picExt}`;
        const picFilepath = path.join(uploadDir, picFilename);

        await fs.writeFile(picFilepath, picture.data);
        coverUrl = `/uploads/${picFilename}`;
      }
    } catch (metaErr) {
      console.warn("Could not parse ID3 tags:", metaErr);
    }

    // Deduplication / Fuzzy Match Check
    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = normalizeString(title);
    const normArtist = normalizeString(artist);

    const existingTracks = await prisma.track.findMany({
      where: { userId: session.user.id as string },
      select: { title: true, artist: true }
    });

    const isDuplicate = existingTracks.some(t =>
      normalizeString(t.title) === normTitle &&
      normalizeString(t.artist || "Unknown Artist") === normArtist
    );

    if (isDuplicate) {
      // Cleanup saved files to prevent orphan files
      await fs.unlink(filepath).catch((err) => {
        console.error(`Failed to delete duplicate track file at ${filepath}:`, err);
      });
      if (coverUrl) {
        // coverUrl is `/uploads/filename`
        const picFilepath = path.join(process.cwd(), coverUrl);
        await fs.unlink(picFilepath).catch((err) => {
          console.error(`Failed to delete duplicate cover file at ${picFilepath}:`, err);
        });
      }
      return NextResponse.json(
        { error: "A track with this title and artist already exists in your library." },
        { status: 409 }
      );
    }

    // 1. String Parsing (The Split)
    const rawArtistString = artist || "Unknown Artist";
    // Split on commas, ampersands, and keywords: feat., ft., featuring, x, X
    const artistNames = rawArtistString
      .split(/,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+[xX]\s+/i)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // 2. Multi-Upsert Loop
    const artistRecords = await Promise.all(
      artistNames.map(async (name) => {
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
        artist, // Keep legacy string for backward compatibility
        album,
        duration,
        fileUrl: `/uploads/${filename}`,
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
