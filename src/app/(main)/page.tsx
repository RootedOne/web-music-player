"use client";

import TrackCard from "@/components/TrackCard";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Track } from "@/store/playerStore";
import { Search as SearchIcon } from "lucide-react";

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || "";
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState(urlQuery);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

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

        {/* Global Search Bar (Hidden on mobile where floating nav takes over) */}
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-[#282828] border-none rounded-full text-white placeholder-gray-400 focus:ring-2 focus:ring-white shadow-md text-sm outline-none transition-all"
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

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading Discover...</div>}>
      <HomeContent />
    </Suspense>
  );
}
