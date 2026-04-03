'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getMusicRequests() {
  try {
    const requests = await prisma.musicRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { username: true },
        },
      },
    });

    // Map Prisma result to match the expected frontend structure
    return {
      success: true,
      data: requests.map((req) => ({
        id: req.id,
        requesterName: req.requester.username,
        targetMusicName: req.targetMusicName,
        targetArtist: req.targetArtist,
        targetAlbum: req.targetAlbum || undefined,
        status: req.status as 'pending' | 'completed',
        createdAt: req.createdAt,
      })),
    };
  } catch (error) {
    console.error('Error fetching music requests:', error);
    return { success: false, error: 'Failed to fetch requests' };
  }
}

export async function createMusicRequest(data: {
  targetMusicName: string;
  targetArtist: string;
  targetAlbum?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!session || !userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    // Pre-Request Validation (Duplicate Check)
    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTargetName = normalizeString(data.targetMusicName);
    const normTargetArtist = normalizeString(data.targetArtist);

    // Fetch all tracks to do accurate contains/matching checks on normalized strings
    // (SQLite Prisma doesn't natively support case-insensitive contains filters via `mode: 'insensitive'`)
    const existingTracks = await prisma.track.findMany({
      select: { title: true, artist: true }
    });

    const isDuplicate = existingTracks.some((t) => {
      const normDBTitle = normalizeString(t.title);
      const normDBArtist = normalizeString(t.artist || '');

      // Exact title match + artist substring match (to catch features/collaborations)
      return normDBTitle === normTargetName && normDBArtist.includes(normTargetArtist);
    });

    if (isDuplicate) {
      return {
        success: false,
        error: 'Duplicate',
        message: 'We already have this music in the library!'
      };
    }

    const newRequest = await prisma.musicRequest.create({
      data: {
        targetMusicName: data.targetMusicName,
        targetArtist: data.targetArtist,
        targetAlbum: data.targetAlbum || null,
        requesterId: userId,
        status: 'pending',
      },
    });

    revalidatePath('/');

    return { success: true, data: newRequest };
  } catch (error) {
    console.error('Error creating music request:', error);
    return { success: false, error: 'Failed to create request' };
  }
}

export async function completeMusicRequest(requestId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const updatedRequest = await prisma.musicRequest.update({
      where: { id: requestId },
      data: { status: 'completed' },
    });

    revalidatePath('/');

    return { success: true, data: updatedRequest };
  } catch (error) {
    console.error('Error completing music request:', error);
    return { success: false, error: 'Failed to update request' };
  }
}
