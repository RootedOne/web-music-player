import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function deleteFileSafely(fileUrl: string | null) {
  if (!fileUrl) return;
  if (!fileUrl.startsWith("/uploads/")) return;

  try {
    const filePath = path.join(process.cwd(), "public", fileUrl);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete old file: ${fileUrl}`, error);
    // Continue running, do not crash API
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("id");

    const tracks = await prisma.track.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        artists: { select: { id: true, name: true } },
        user: { select: { username: true } },
      },
    });

    // If a specific ID was requested, ensure it's in the list
    if (requestedId && !tracks.find(t => t.id === requestedId)) {
      const specificTrack = await prisma.track.findUnique({
        where: { id: requestedId },
        include: {
          artists: { select: { id: true, name: true } },
          user: { select: { username: true } },
        },
      });

      if (specificTrack) {
        tracks.unshift(specificTrack);
      }
    }

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Failed to fetch tracks:", error);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const album = formData.get("album") as string;
    const artistId = formData.get("artistId") as string;
    const coverFile = formData.get("cover") as File | null;

    if (!id || !title || !artistId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const currentTrack = await prisma.track.findUnique({
      where: { id },
      include: { artists: true }
    });

    if (!currentTrack) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    let newCoverUrl = currentTrack.coverUrl;

    if (coverFile && coverFile.size > 0) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const fileName = `custom_cover_${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, buffer);

      newCoverUrl = `/uploads/${fileName}`;

      // Safely delete old image
      await deleteFileSafely(currentTrack.coverUrl);
    }

    // Update track with new text fields, new coverUrl, and connect new artist via set
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        title,
        album,
        coverUrl: newCoverUrl,
        artists: {
          set: [{ id: artistId }],
        },
      },
      include: {
        artists: { select: { id: true, name: true } },
        user: { select: { username: true } },
      },
    });

    return NextResponse.json(updatedTrack);
  } catch (error) {
    console.error("Failed to update track:", error);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    }

    const currentTrack = await prisma.track.findUnique({
      where: { id },
    });

    if (!currentTrack) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Critical: Delete both Audio File and Cover Image File
    await deleteFileSafely(currentTrack.fileUrl);
    await deleteFileSafely(currentTrack.coverUrl);

    // Prisma handles deleting relational PlaylistTrack records via onDelete: Cascade
    await prisma.track.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete track:", error);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}