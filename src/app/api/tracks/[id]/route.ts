import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json(track, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch track" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trackId = params.id;
    const track = await prisma.track.findUnique({ where: { id: trackId } });

    if (!track || track.userId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string | null;
    const album = formData.get("album") as string | null;
    const coverFile = formData.get("coverFile") as File | null;

    let coverUrl = track.coverUrl;

    if (coverFile && coverFile.size > 0) {
      const arrayBuffer = await coverFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadDir = path.join(process.cwd(), "public/uploads");
      const picUniqueId = crypto.randomBytes(16).toString("hex");
      const ext = path.extname(coverFile.name).toLowerCase() || '.jpg';
      const picFilename = `custom_cover_${picUniqueId}${ext}`;
      const picFilepath = path.join(uploadDir, picFilename);

      await fs.writeFile(picFilepath, buffer);

      if (track.coverUrl) {
        const oldPicFilepath = path.join(process.cwd(), "public", track.coverUrl);
        await fs.unlink(oldPicFilepath).catch((err) => console.error("Failed to delete old track cover:", err));
      }

      coverUrl = `/uploads/${picFilename}`;
    }

    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        title: title || track.title,
        artist: artist !== null ? artist : track.artist,
        album: album !== null ? album : track.album,
        coverUrl,
      },
    });

    return NextResponse.json(updatedTrack, { status: 200 });
  } catch (error) {
    console.error("Edit track error:", error);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trackId = params.id;
    const track = await prisma.track.findUnique({ where: { id: trackId } });

    if (!track || track.userId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (track.fileUrl) {
      const filepath = path.join(process.cwd(), "public", track.fileUrl);
      await fs.unlink(filepath).catch((err) => console.error("Failed to delete track file:", err));
    }

    if (track.coverUrl) {
      const picFilepath = path.join(process.cwd(), "public", track.coverUrl);
      await fs.unlink(picFilepath).catch((err) => console.error("Failed to delete track cover:", err));
    }

    await prisma.track.delete({
      where: { id: trackId },
    });

    return NextResponse.json({ message: "Track deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete track error:", error);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}
