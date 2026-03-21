"use client";

import TrackCard from "@/components/TrackCard";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import { Track, usePlayerStore } from "@/store/playerStore";
import { Search as SearchIcon, Play, Pause, Shuffle } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { playQueue, pause, resume, toggleShuffle, isShuffle, isPlaying, queue } = usePlayerStore();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTracks(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchTracks = async (searchQuery: string = "") => {
    setIsLoading(true);
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/tracks?filter=global${searchParam}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          Discover
        </h1>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-gray-800 border-none rounded-full text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 shadow-md text-sm outline-none transition-all"
            placeholder="Search all songs and artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-300 shadow-md border border-gray-700">
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      </header>

      {tracks.length > 0 && !isLoading && (
        <div className="flex items-center gap-4 md:gap-6 mb-8 mt-2">
          <button
            onClick={() => {
              const isCurrentFeedPlaying = queue.length === tracks.length && queue.every((t, i) => t.id === tracks[i]?.id);
              if (isCurrentFeedPlaying && isPlaying) {
                pause();
              } else if (isCurrentFeedPlaying && !isPlaying) {
                resume();
              } else {
                playQueue(tracks, 0);
              }
            }}
            className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg text-black"
          >
            {queue.length === tracks.length && queue.every((t, i) => t.id === tracks[i]?.id) && isPlaying ? (
              <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 md:w-6 md:h-6 ml-1 fill-current" />
            )}
          </button>

          <button
            onClick={() => {
              const isCurrentFeedPlaying = queue.length === tracks.length && queue.every((t, i) => t.id === tracks[i]?.id);
              if (!isCurrentFeedPlaying) playQueue(tracks, 0);
              toggleShuffle();
            }}
            className={`p-3 rounded-full hover:scale-105 active:scale-95 transition relative ${isShuffle ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            title="Shuffle Play"
          >
            <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
            {isShuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></span>}
          </button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">
            {query ? `Search Results for "${query}"` : "Global Feed"}
        </h2>

        {isLoading ? (
            <p className="text-gray-500">Loading tracks...</p>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
               {tracks.length === 0 ? (
                 <div className="col-span-full text-gray-500 py-8">
                   {query ? "No matching tracks found." : "No tracks have been uploaded to the platform yet. Be the first!"}
                 </div>
               ) : (
                 tracks.map(track => (
                   <TrackCard key={track.id} track={track} />
                 ))
               )}
            </div>
        )}
      </section>
    </>
  );
}
