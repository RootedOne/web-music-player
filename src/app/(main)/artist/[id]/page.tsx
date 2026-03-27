"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Track, usePlayerStore } from "@/store/playerStore";
import TrackRow from "@/components/TrackRow";
import { Play, Music, ChevronLeft, ChevronRight } from "lucide-react";

type AlbumData = {
  albumName: string;
  releaseYear: string;
  coverUrl: string | null;
};

type ArtistData = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracks: Track[];
  topSongs: Track[];
  albums: AlbumData[];
};

export default function ArtistProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playQueue } = usePlayerStore();

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artists/${id}`);
        if (res.ok) {
          setArtist(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchArtist();
  }, [id]);

  if (isLoading) return <div className="p-8 text-white min-h-screen bg-black">Loading Artist...</div>;
  if (!artist) return <div className="p-8 text-white min-h-screen bg-black">Artist not found.</div>;

  const handlePlayAll = () => {
    if (artist.tracks.length > 0) {
      playQueue(artist.tracks, 0);
    }
  };

  // Data from backend
  const topSongs = artist.topSongs || [];
  const albumsList = artist.albums || [];

  return (
    <div className="relative min-h-screen bg-black text-white pb-36 font-sans">
      {/* 1. Sticky Nav */}
      <nav className="sticky top-0 z-50 w-full flex items-center px-4 py-4 md:py-6 bg-black/50 backdrop-blur-md transition-all pt-safe">
        <button
           onClick={() => router.back()}
           className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white backdrop-blur-md"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </nav>

      {/* 1. Hero Header */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] max-h-[600px] overflow-hidden -mt-[72px] md:-mt-[88px]">
        {/* Full Bleed Background Image */}
        {artist.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${artist.imageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
            <Music className="w-32 h-32 text-neutral-700" />
          </div>
        )}

        {/* Gradient Overlay bottom to top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Hero Content (Bottom Left/Right) */}
        <div className="absolute bottom-0 w-full px-6 pb-6 flex items-end justify-between">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-white drop-shadow-xl w-[70%] leading-none">
            {artist.name}
          </h1>
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500 hover:bg-blue-400 hover:scale-105 transition-all flex items-center justify-center shadow-[0_8px_32px_rgba(59,130,246,0.5)] shrink-0 group"
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-black text-black ml-1 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="px-6 mx-auto max-w-7xl mt-6 space-y-12">
        {/* 2. Top Songs List (Vertical) */}
        {topSongs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 group cursor-pointer">
              <h2 className="text-xl font-bold text-white/90 tracking-tight group-hover:text-white transition-colors">Top Songs</h2>
              <Link href={`/artist/${artist.id}/songs`}>
                <ChevronRight className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {topSongs.map((track, idx) => (
                <TrackRow
                   key={track.id}
                   track={track}
                   index={idx}
                   queue={topSongs}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Discography Carousels (Horizontal Scrolling) */}

        {/* Albums */}
        {albumsList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 group cursor-pointer">
              <h2 className="text-xl font-bold text-white/90 tracking-tight group-hover:text-white transition-colors">Albums</h2>
              <Link href={`/artist/${artist.id}/albums`}>
                <ChevronRight className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
              </Link>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto gap-4 sm:gap-6 snap-x snap-mandatory pb-4 hide-scrollbar">
              {albumsList.map((album, idx) => (
                <Link key={idx} href={`/artist/${artist.id}/album/${encodeURIComponent(album.albumName)}`} className="flex flex-col snap-start min-w-[140px] sm:min-w-[180px] group cursor-pointer">
                  <div className="w-full aspect-square rounded-lg bg-neutral-800 overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all">
                    {album.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={album.coverUrl} alt={album.albumName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-neutral-600" /></div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">
                    {album.albumName}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                    {album.releaseYear}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Hide Scrollbar Global CSS Addition */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
