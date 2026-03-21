"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/store/playerStore";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracks?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.tracks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="mb-8 mt-4 sticky top-0 z-10 bg-black/90 backdrop-blur-md pb-4 pt-4 rounded-lg px-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6">Search</h1>
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-[#242424] border-none rounded-full text-white placeholder-gray-400 focus:ring-2 focus:ring-white shadow-lg text-lg outline-none transition-all"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      <section className="mt-8 px-2">
        {query.trim() === "" ? (
          <div className="text-center text-gray-500 mt-20">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold">Search for songs or artists</h2>
            <p className="mt-2 text-sm">Find your favorite tracks across the global library.</p>
          </div>
        ) : isLoading ? (
           <p className="text-gray-400 text-center mt-10">Searching...</p>
        ) : results.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Songs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((track) => (
                <div key={track.id} className="relative group/card">
                  <TrackCard track={track} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">No results found for &quot;{query}&quot;</p>
        )}
      </section>
    </>
  );
}
