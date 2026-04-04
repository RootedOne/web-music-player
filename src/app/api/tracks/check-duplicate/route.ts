import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to verify admin basic auth
function isAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const authMatch = authHeader.match(/^Basic\s+(.*)$/);
  if (!authMatch) return false;

  const credentials = Buffer.from(authMatch[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  return (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  );
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isBasicAuthAdmin = isAdmin(req);

    if (!session && !isBasicAuthAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');

    if (!title) {
      return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
    }

    // Since we're using SQLite, we can't use mode: 'insensitive' with contains.
    // We also want exact match case-insensitive.
    // SQLite's string equality is case-insensitive by default in some configurations,
    // but Prisma's `equals` is normally case-sensitive.
    // Because mode: 'insensitive' is not supported by SQLite in Prisma,
    // we fetch all tracks and do the comparison in memory if we really have to.
    // However, Prisma documentation says mode: 'insensitive' is supported for PostgreSQL and MongoDB.
    // For SQLite, Prisma does case-sensitive matches for equals.
    // The easiest robust way is to fetch all records and do a JS `.toLowerCase()` check.
    // But since this could be slow for many tracks, let's see if we can optimize it.
    // For now, let's just fetch everything and find a match.
    // To minimize memory, we only select title and artist.

    // Better approach: Since we want a case-insensitive match, we can pull all tracks
    // and filter them.

    const allTracks = await prisma.track.findMany({
      select: { title: true, artist: true }
    });

    const titleLower = title.toLowerCase();
    const artistLower = artist ? artist.toLowerCase() : '';

    const isDuplicate = allTracks.some(track => {
      const dbTitleLower = track.title.toLowerCase();
      const dbArtistLower = track.artist ? track.artist.toLowerCase() : '';

      if (artist) {
        return dbTitleLower === titleLower && dbArtistLower === artistLower;
      } else {
        return dbTitleLower === titleLower;
      }
    });

    return NextResponse.json({ isDuplicate }, { status: 200 });
  } catch (error) {
    console.error('Error checking for duplicate track:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
