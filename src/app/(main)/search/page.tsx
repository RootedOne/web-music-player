"use client";

import { useState, useEffect, Suspense } from "react";
import { Search as SearchIcon, Music } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/store/playerStore";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";
import TrackRow from "@/components/TrackRow";
import { useSearchParams, useRouter } from "next/navigation";

type SearchResults = {
  tracks: Track[];
  artists: { id: string; name: string; imageUrl: string | null }[];
  playlists: { id: string; name: string; coverUrl: string | null }[];
  albums: { id: string; name: string; artist: string; imageUrl: string | null }[];
};

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || "";

  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);
  const [activeFilter, setActiveFilter] = useState("All");
  const router = useRouter();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== query) {
      setQuery(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Sync back to URL so sidebar search stays in sync
    const newUrl = new URL(window.location.href);
    if (val.trim()) {
      newUrl.searchParams.set("q", val);
    } else {
      newUrl.searchParams.delete("q");
    }
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    playlists: [],
    albums: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery, activeFilter);
    } else {
      setResults({ tracks: [], artists: [], playlists: [], albums: [] });
    }
  }, [debouncedQuery, activeFilter]);

  const performSearch = async (searchQuery: string, filter: string) => {
    setIsLoading(true);
    try {
      let url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
      if (filter !== "All") {
        url += `&type=${encodeURIComponent(filter)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filters = ["All", "Songs", "Artists", "Albums", "Playlists"];

  return (
    <>
      <header className="mb-8 mt-4 sticky top-0 z-10 bg-black/90 backdrop-blur-md pb-4 pt-4 rounded-lg px-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6">Search</h1>

        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 start-0 ms-3 flex items-center pointer-events-none">
            <SearchIcon className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full ps-12 pe-4 py-4 bg-neutral-800/50 backdrop-blur-md border-none rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-white shadow-lg text-lg outline-none transition-all"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={handleQueryChange}
            autoFocus
          />
        </div>

        <div className="flex overflow-x-auto snap-x gap-2 mt-4 hide-scrollbar">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`snap-start px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                activeFilter === filter
                  ? "bg-[#fa243c] text-white shadow-md"
                  : "bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-8 px-2">
        {debouncedQuery.trim() === "" ? (
          <div className="text-center text-gray-500 mt-20">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold">Search for songs, artists, or albums</h2>
            <p className="mt-2 text-sm">Find your favorite tracks across the global library.</p>
          </div>
        ) : isLoading ? (
           <p className="text-gray-400 text-center mt-10">Searching...</p>
        ) : (
          <div className="space-y-12">

            {/* NO RESULTS */}
            {results.tracks.length === 0 && results.artists.length === 0 && results.playlists.length === 0 && results.albums.length === 0 && (
              <p className="text-center text-gray-500 mt-10">No results found for &quot;{debouncedQuery}&quot;</p>
            )}

            {/* ARTISTS SECTION */}
            {(activeFilter === "All" || activeFilter === "Artists") && results.artists.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-white">Artists</h2>
                  {activeFilter === "All" && (
                    <button onClick={() => setActiveFilter("Artists")} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Show all</button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.artists.map((artist) => (
                    <Link key={artist.id} href={`/artist/${encodeURIComponent(artist.id)}`} className="flex flex-col items-center group cursor-pointer">
                      <div className="w-full aspect-square rounded-full bg-neutral-800 overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-all">
                        {artist.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music className="w-12 h-12 text-neutral-600" /></div>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-center truncate w-full group-hover:text-blue-400 transition-colors">{artist.name}</h3>
                      <p className="text-sm text-gray-400">Artist</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* SONGS SECTION */}
            {(activeFilter === "All" || activeFilter === "Songs") && results.tracks.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-white">Songs</h2>
                  {activeFilter === "All" && (
                    <button onClick={() => setActiveFilter("Songs")} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Show all</button>
                  )}
                </div>

                {activeFilter === "All" ? (
                  // List view for "All"
                  <div className="flex flex-col gap-1">
                    {results.tracks.slice(0, 4).map((track, idx) => (
                      <TrackRow key={track.id} track={track} index={idx} queue={results.tracks} />
                    ))}
                  </div>
                ) : (
                  // Grid view for "Songs" specific
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {results.tracks.map((track) => (
                      <div key={track.id} className="relative group/card">
                        <TrackCard track={track} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ALBUMS SECTION */}
            {(activeFilter === "All" || activeFilter === "Albums") && results.albums.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-white">Albums</h2>
                  {activeFilter === "All" && (
                    <button onClick={() => setActiveFilter("Albums")} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Show all</button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.albums.map((album) => (
                    <Link key={album.id} href={`/album/${encodeURIComponent(album.id)}`} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition cursor-pointer group shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                      <div className="w-full aspect-square bg-[#282828] rounded-md mb-4 flex items-center justify-center overflow-hidden relative">
                        {album.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.imageUrl} alt={album.name} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-10 h-10 text-gray-600" />
                        )}
                      </div>
                      <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">{album.name}</h3>
                      <p className="text-gray-400 text-sm truncate">{album.artist || "Unknown Artist"}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYLISTS SECTION */}
            {(activeFilter === "All" || activeFilter === "Playlists") && results.playlists.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-white">Playlists</h2>
                  {activeFilter === "All" && (
                    <button onClick={() => setActiveFilter("Playlists")} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Show all</button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.playlists.map((pl) => (
                    <Link key={pl.id} href={`/playlists/${pl.id}`} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition cursor-pointer group shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                      <div className="w-full aspect-square bg-[#282828] rounded-md mb-4 flex items-center justify-center overflow-hidden relative">
                        {pl.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-10 h-10 text-gray-600" />
                        )}
                      </div>
                      <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">{pl.name}</h3>
                      <p className="text-gray-400 text-sm truncate">Playlist</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </section>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
