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
    <>
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
            <SearchIcon className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            className="block w-full ps-10 pe-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-white placeholder-neutral-500 focus:ring-2 focus:ring-white shadow-md text-sm outline-none transition-all"
            placeholder="Search all songs and artists..."
            value={query}
            onChange={handleSearchChange}
          />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-neutral-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-neutral-300 shadow-md border border-white/10">
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-white hidden md:block">
            Global Feed
        </h2>

        {isLoading ? (
            <p className="text-neutral-500">Loading tracks...</p>
        ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-40 md:pb-0 hide-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 md:overflow-visible">
               {tracks.length === 0 ? (
                 <div className="col-span-full text-neutral-500 py-8">
                   No tracks have been uploaded to the platform yet. Be the first!
                 </div>
               ) : (
                 tracks.map(track => (
                   <div key={track.id} className="snap-start shrink-0 w-40 md:w-auto">
                     <TrackCard track={track} />
                   </div>
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
