"use client";

import TrackCard from "@/components/TrackCard";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import React, { useState, useEffect, Suspense } from "react";
import { Track } from "@/store/playerStore";
import { Search as SearchIcon, Music } from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";

function HomeContent() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    fetchInitialTracks();
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

  const fetchInitialTracks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracks?filter=global&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks);
        setNextCursor(data.nextCursor);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreTracks = async () => {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/tracks?filter=global&limit=50&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setTracks((prev) => [...prev, ...data.tracks]);
        setNextCursor(data.nextCursor);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingMore(false);
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

        {isLoading && tracks.length === 0 ? (
            <p className="text-gray-500">Loading tracks...</p>
        ) : tracks.length === 0 ? (
            <div className="col-span-full text-gray-500 py-8">
               No tracks have been uploaded to the platform yet. Be the first!
            </div>
        ) : (
          <VirtuosoGrid
            useWindowScroll={false}
            customScrollParent={typeof window !== 'undefined' ? document.querySelector('main') || undefined : undefined}
            totalCount={tracks.length}
            overscan={200}
            data={tracks}
            components={{
              List: React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(function VirtuosoList({ style, children, ...props }, ref) {
                return (
                  <div
                    ref={ref}
                    {...props}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                    style={{ ...style }}
                  >
                    {children}
                  </div>
                );
              }),
              Item: React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(function VirtuosoItem({ children, ...props }, ref) {
                return <div ref={ref} {...props}>{children}</div>;
              })
            }}
            itemContent={(index, track) => (
               <TrackCard key={track.id} track={track} onUpdate={fetchInitialTracks} onDelete={fetchInitialTracks} />
            )}
            endReached={loadMoreTracks}
          />
        )}
        {isFetchingMore && (
           <div className="flex justify-center mt-6">
              <div className="w-6 h-6 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
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
