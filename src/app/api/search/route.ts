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
        },
      });
    }

    // Artists: We query tracks and group them by artist string to simulate "Artists"
    // In our schema, artist is a string field on Track.
    if (!type || type === "Artists") {
      artistsPromise = prisma.track
        .groupBy({
          by: ["artist"],
          where: {
            artist: { contains: query },
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
        .then(async (artistGroups) => {
          // To get an image for the artist, we can fetch one track per artist
          const artistsWithImages = await Promise.all(
            artistGroups.map(async (group) => {
              if (!group.artist) return null;
              const sampleTrack = await prisma.track.findFirst({
                where: { artist: group.artist },
                select: { coverUrl: true },
              });
              return {
                id: group.artist, // use name as ID for routing
                name: group.artist,
                imageUrl: sampleTrack?.coverUrl || null,
              };
            })
          );
          return artistsWithImages.filter(Boolean);
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
                select: { coverUrl: true, artist: true },
              });
              return {
                id: group.album,
                name: group.album,
                artist: sampleTrack?.artist || "Unknown Artist",
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
