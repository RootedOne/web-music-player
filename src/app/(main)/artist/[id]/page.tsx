"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Track, usePlayerStore } from "@/store/playerStore";
import TrackRow from "@/components/TrackRow";
import { Play, Music, ChevronLeft, ChevronRight, Plus } from "lucide-react";

type ArtistData = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracks: Track[];
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

  // Group tracks for layout logic
  // Typically an API would separate singles/albums, but we'll mock it for now based on track list
  const latestRelease = artist.tracks.length > 0 ? artist.tracks[0] : null;
  const topSongs = artist.tracks.slice(0, 5);

  // Deduping by album for the carousels
  const uniqueAlbums = Array.from(new Set(artist.tracks.map(t => t.album).filter(Boolean)));
  const albumsList = uniqueAlbums.map(albumName => {
      return artist.tracks.find(t => t.album === albumName);
  }).filter(Boolean) as Track[];

  // Fallback Singles list if no albums
  const singlesList = artist.tracks.filter(t => !t.album || t.album === "Unknown Album" || t.album === "Single");

  return (
    <div className="relative min-h-screen bg-black text-white pb-40 font-sans">
      {/* 1. Sticky Nav */}
      <nav className="sticky top-0 z-50 w-full flex items-center p-4 bg-black/40 backdrop-blur-xl border-b border-white/5 transition-all">
        <button
           onClick={() => router.back()}
           className="w-12 h-12 flex items-center justify-center rounded-full bg-black/50 active:bg-black/80 transition-colors text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </nav>

      {/* 1. Hero Header */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] max-h-[600px] overflow-hidden -mt-[73px]">
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
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#fa243c] active:bg-[#d41b2f] active:scale-95 transition-all flex items-center justify-center shadow-[0_8px_32px_rgba(250,36,60,0.5)] shrink-0 group"
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="px-6 mx-auto max-w-7xl mt-6 space-y-12">
        {/* 2. Latest Release Section */}
        {latestRelease && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-white/90 tracking-tight">Latest Release</h2>
            <div className="flex bg-neutral-900/40 backdrop-blur-lg border border-white/5 rounded-3xl p-4 gap-4 items-center active:bg-neutral-800/60 transition-colors group cursor-pointer active:scale-95 transition-transform">
               {/* Left: Artwork */}
               <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-800 overflow-hidden shrink-0 shadow-lg">
                 {latestRelease.coverUrl ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={latestRelease.coverUrl} alt={latestRelease.album || latestRelease.title} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center"><Music className="w-8 h-8 text-neutral-600" /></div>
                 )}
               </div>

               {/* Right: Info */}
               <div className="flex-1 min-w-0 flex flex-col justify-center">
                 <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
                   {latestRelease.createdAt ? new Date(latestRelease.createdAt).getFullYear() : ""}
                 </p>
                 <h3 className="text-white font-bold text-lg truncate">
                   {latestRelease.album || latestRelease.title} <span className="font-normal text-neutral-400">- {latestRelease.album ? 'Album' : 'Single'}</span>
                 </h3>
                 <p className="text-sm text-neutral-500 mt-0.5">1 Song</p>
               </div>

               {/* Right: + Button */}
               <button className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center shrink-0 transition-colors text-white">
                 <Plus className="w-5 h-5" />
               </button>
            </div>
          </section>
        )}

        {/* 3. Top Songs List (Vertical) */}
        {topSongs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 group cursor-pointer min-h-[44px]">
              <h2 className="text-xl font-bold text-white/90 tracking-tight active:text-white transition-colors">Top Songs</h2>
              <ChevronRight className="w-5 h-5 text-neutral-500 active:text-white transition-colors" />
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

        {/* 4. Discography Carousels (Horizontal Scrolling) */}

        {/* Albums */}
        {albumsList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 group cursor-pointer min-h-[44px]">
              <h2 className="text-xl font-bold text-white/90 tracking-tight active:text-white transition-colors">Albums</h2>
              <ChevronRight className="w-5 h-5 text-neutral-500 active:text-white transition-colors" />
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto gap-4 sm:gap-6 snap-x snap-mandatory pb-4 hide-scrollbar">
              {albumsList.map((track) => (
                <div key={track.id} onClick={() => router.push(`/album/${encodeURIComponent(track.album!)}`)} className="flex flex-col snap-start min-w-[140px] sm:min-w-[180px] group cursor-pointer active:scale-95 transition-transform">
                  <div className="w-full aspect-square rounded-3xl bg-neutral-800 overflow-hidden mb-3 shadow-md border border-white/10 active:shadow-xl transition-all">
                    {track.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverUrl} alt={track.album || "Album"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-neutral-600" /></div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-white transition-colors">
                    {track.album}
                  </h3>
                  <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                    {track.createdAt ? new Date(track.createdAt).getFullYear() : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Singles & EPs */}
        {singlesList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 group cursor-pointer min-h-[44px]">
              <h2 className="text-xl font-bold text-white/90 tracking-tight active:text-white transition-colors">Singles & EPs</h2>
              <ChevronRight className="w-5 h-5 text-neutral-500 active:text-white transition-colors" />
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto gap-4 sm:gap-6 snap-x snap-mandatory pb-4 hide-scrollbar">
              {singlesList.map((track) => (
                <div key={track.id} className="flex flex-col snap-start min-w-[140px] sm:min-w-[180px] group cursor-pointer active:scale-95 transition-transform">
                  <div className="w-full aspect-square rounded-3xl bg-neutral-800 overflow-hidden mb-3 shadow-md border border-white/10 active:shadow-xl transition-all">
                    {track.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-neutral-600" /></div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-white transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                    {track.createdAt ? new Date(track.createdAt).getFullYear() : ""}
                  </p>
                </div>
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
