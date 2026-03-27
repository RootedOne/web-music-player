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

    const uploadDir = path.join(process.cwd(), "public/uploads");
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
        const picFilepath = path.join(process.cwd(), "public", coverUrl);
        await fs.unlink(picFilepath).catch((err) => {
          console.error(`Failed to delete duplicate cover file at ${picFilepath}:`, err);
        });
      }
      return NextResponse.json(
        { error: "A track with this title and artist already exists in your library." },
        { status: 409 }
      );
    }

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        album,
        duration,
        fileUrl: `/uploads/${filename}`,
        coverUrl,
        userId: session.user.id as string,
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
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tracks }, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}
