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
          select: { username: true, id: true },
        },
      },
    });

    // Map Prisma result to match the expected frontend structure
    return {
      success: true,
      data: requests.map((req) => ({
        id: req.id,
        requesterName: req.requester.username,
        requesterId: req.requester.id,
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
  force?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!session || !userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    // Pre-Request Validation (Duplicate Check)
    if (!data.force) {
      const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTargetName = normalizeString(data.targetMusicName);
      const normTargetArtist = normalizeString(data.targetArtist);

      // Fetch all tracks to do accurate contains/matching checks on normalized strings
      // (SQLite Prisma doesn't natively support case-insensitive contains filters via `mode: 'insensitive'`)
      const existingTracks = await prisma.track.findMany({
        select: { title: true, artist: true }
      });

      const matchedTrack = existingTracks.find((t) => {
        const normDBTitle = normalizeString(t.title);
        const normDBArtist = normalizeString(t.artist || '');

        // Exact title match AND (DB artist includes Req artist OR Req artist includes DB artist)
        // This handles "Behzad Leito" vs "Leito" and "Leito & Gdaal" vs "Leito"
        const isTitleMatch = normDBTitle === normTargetName;
        const isArtistMatch = normDBArtist.includes(normTargetArtist) || normTargetArtist.includes(normDBArtist);

        return isTitleMatch && isArtistMatch;
      });

      if (matchedTrack) {
        return {
          success: false,
          error: 'Duplicate',
          message: 'We already have similar music in the library!',
          matchedTrack: {
            musicName: matchedTrack.title,
            artist: matchedTrack.artist || 'Unknown Artist',
          }
        };
      }
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

export async function updateMusicRequest(
  requestId: string,
  data: { targetMusicName: string; targetArtist: string; targetAlbum?: string }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!session || !userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const existingRequest = await prisma.musicRequest.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return { success: false, error: 'Request not found.' };
    }

    if (existingRequest.requesterId !== userId) {
      return { success: false, error: 'Forbidden. You can only edit your own requests.' };
    }

    if (existingRequest.status === 'completed') {
       return { success: false, error: 'Cannot edit a completed request.' };
    }

    const updatedRequest = await prisma.musicRequest.update({
      where: { id: requestId },
      data: {
        targetMusicName: data.targetMusicName,
        targetArtist: data.targetArtist,
        targetAlbum: data.targetAlbum || null,
      },
    });

    revalidatePath('/');
    return { success: true, data: updatedRequest };
  } catch (error) {
    console.error('Error updating music request:', error);
    return { success: false, error: 'Failed to update request' };
  }
}

export async function deleteMusicRequest(requestId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!session || !userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const existingRequest = await prisma.musicRequest.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return { success: false, error: 'Request not found.' };
    }

    if (existingRequest.requesterId !== userId) {
      return { success: false, error: 'Forbidden. You can only delete your own requests.' };
    }

    await prisma.musicRequest.delete({
      where: { id: requestId }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting music request:', error);
    return { success: false, error: 'Failed to delete request' };
  }
}
