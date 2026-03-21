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

    try {
      const metadata = await mm.parseBuffer(buffer, file.type);
      if (metadata.common.title) title = metadata.common.title;
      if (metadata.common.artist) artist = metadata.common.artist;
      if (metadata.common.album) album = metadata.common.album;
      if (metadata.format.duration) duration = metadata.format.duration;
    } catch (metaErr) {
      console.warn("Could not parse ID3 tags:", metaErr);
    }

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        album,
        duration,
        fileUrl: `/uploads/${filename}`,
        userId: session.user.id as string,
      },
    });

    return NextResponse.json({ message: "Upload successful", track }, { status: 201 });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tracks = await prisma.track.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tracks }, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}
