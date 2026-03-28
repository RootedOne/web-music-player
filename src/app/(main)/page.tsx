"use client";

import TrackCard from "@/components/TrackCard";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Track } from "@/store/playerStore";
import { Search as SearchIcon, Music } from "lucide-react";

function HomeContent() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    fetchTracks();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      router.push(`/search?q=${encodeURIComponent(val)}`);
    } else {
      router.push(`/search`);
    }
  };

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracks?filter=global`);
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
    <div className="min-h-full bg-transparent flex-1 text-white pb-36 md:pb-8">
      <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          Discover
        </h1>

        {/* Mobile Logo (Top Right) */}
        <div className="absolute right-0 top-0 md:hidden flex items-center justify-center pointer-events-none text-white opacity-80 mt-1">
           <Music className="w-8 h-8 drop-shadow-lg" />
        </div>

        {/* Global Search Bar (Hidden on mobile where floating nav takes over) */}
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full ps-10 pe-4 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fa243c] shadow-md text-sm outline-none transition-all"
            placeholder="Search all songs and artists..."
            value={query}
            onChange={handleSearchChange}
          />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-300 shadow-md border border-white/10">
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-100 hidden md:block">
            Global Feed
        </h2>

        {isLoading ? (
            <p className="text-gray-500">Loading tracks...</p>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
               {tracks.length === 0 ? (
                 <div className="col-span-full text-gray-500 py-8">
                   No tracks have been uploaded to the platform yet. Be the first!
                 </div>
               ) : (
                 tracks.map(track => (
                   <TrackCard key={track.id} track={track} />
                 ))
               )}
            </div>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-white min-h-full bg-transparent">Loading Discover...</div>}>
      <HomeContent />
    </Suspense>
  );
}
