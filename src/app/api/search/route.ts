import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // Optional filter

    if (!query) {
      return NextResponse.json(
        { tracks: [], artists: [], playlists: [], albums: [] },
        { status: 200 }
      );
    }

    const takeLimit = 10;

    // We'll conditionally run queries based on `type`.
    // If no type is provided, we fetch everything for the "All" view.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tracksPromise: Promise<any[]> = Promise.resolve([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let artistsPromise: Promise<any[]> = Promise.resolve([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playlistsPromise: Promise<any[]> = Promise.resolve([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let albumsPromise: Promise<any[]> = Promise.resolve([]);

    if (!type || type === "Songs") {
      tracksPromise = prisma.track.findMany({
        where: {
          title: { contains: query },
        },
        take: takeLimit,
        include: {
          user: { select: { username: true } },
          artists: true,
        },
      });
    }

    if (!type || type === "Artists") {
      // Prioritize the actual normalized Artist table
      artistsPromise = prisma.artist.findMany({
        where: {
          name: { contains: query },
        },
        take: takeLimit,
        include: {
          tracks: { take: 1, select: { coverUrl: true } }
        }
      }).then(async (normalizedArtists) => {
         const foundNames = new Set(normalizedArtists.map(a => a.name.toLowerCase()));

         const results = normalizedArtists.map(a => ({
             id: a.id,
             name: a.name,
             imageUrl: a.imageUrl || a.tracks[0]?.coverUrl || null
         }));

         // Fallback padding: If we don't have enough limit from the new table, find legacy raw strings
         if (results.length < takeLimit) {
            const legacyGroups = await prisma.track.groupBy({
                by: ["artist"],
                where: { artist: { contains: query } },
                _count: { id: true },
                orderBy: { _count: { id: "desc" } },
                take: takeLimit - results.length
            });

            for (const group of legacyGroups) {
               if (!group.artist) continue;
               if (!foundNames.has(group.artist.toLowerCase())) {
                   const sampleTrack = await prisma.track.findFirst({
                       where: { artist: group.artist },
                       select: { coverUrl: true },
                   });
                   results.push({
                       id: group.artist,
                       name: group.artist,
                       imageUrl: sampleTrack?.coverUrl || null
                   });
                   foundNames.add(group.artist.toLowerCase());
               }
            }
         }

         return results;
      });
    }

    if (!type || type === "Playlists") {
      playlistsPromise = prisma.playlist.findMany({
        where: {
          name: { contains: query },
        },
        take: takeLimit,
        select: {
          id: true,
          name: true,
          coverUrl: true,
          userId: true,
          user: { select: { username: true } },
        },
      });
    }

    // Albums: Similar to Artists, group tracks by album string
    if (!type || type === "Albums") {
      albumsPromise = prisma.track
        .groupBy({
          by: ["album"],
          where: {
            album: { contains: query },
            // Don't include empty albums
            NOT: { album: null },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          take: takeLimit,
        })
        .then(async (albumGroups) => {
          const albumsWithImages = await Promise.all(
            albumGroups.map(async (group) => {
              if (!group.album) return null;
              const sampleTrack = await prisma.track.findFirst({
                where: { album: group.album },
                select: { coverUrl: true, artist: true, artists: true },
              });

              // Fallback to parsed artists from model if available
              let displayArtist = sampleTrack?.artist || "Unknown Artist";
              if (sampleTrack?.artists && sampleTrack.artists.length > 0) {
                 displayArtist = sampleTrack.artists.map(a => a.name).join(", ");
              }

              return {
                id: group.album,
                name: group.album,
                artist: displayArtist,
                imageUrl: sampleTrack?.coverUrl || null,
              };
            })
          );
          return albumsWithImages.filter(Boolean);
        });
    }

    const [tracks, artists, playlists, albums] = await Promise.all([
      tracksPromise,
      artistsPromise,
      playlistsPromise,
      albumsPromise,
    ]);

    return NextResponse.json(
      { tracks, artists, playlists, albums },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
