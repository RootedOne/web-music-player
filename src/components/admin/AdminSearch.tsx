"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, X, User as UserIcon, Music, Mic2, ListMusic } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchUser {
  id: string;
  username: string;
}

interface SearchTrack {
  id: string;
  title: string;
  artists: { name: string }[];
  user: { username: string } | null;
}

interface SearchArtist {
  id: string;
  name: string;
}

interface SearchPlaylist {
  id: string;
  name: string;
  user: { username: string } | null;
  _count: { tracks: number } | null;
}

interface SearchResults {
  users: SearchUser[];
  tracks: SearchTrack[];
  artists: SearchArtist[];
  playlists: SearchPlaylist[];
}

export function AdminSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResults>({
    users: [],
    tracks: [],
    artists: [],
    playlists: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults({ users: [], tracks: [], artists: [], playlists: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Admin search failed", error);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  const totalResults =
    results.users.length +
    results.tracks.length +
    results.artists.length +
    results.playlists.length;

  return (
    <div className="relative w-full max-w-xl mx-auto mb-8 z-40">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#fa243c] focus:border-transparent focus:bg-white/10 outline-none transition-all shadow-xl backdrop-blur-md"
          placeholder="Search all records (Users, Tracks, Artists, Playlists)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setShowDropdown(false);
            }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showDropdown && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-400">Searching global records...</div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-gray-400">No records found for &quot;{query}&quot;</div>
          ) : (
            <div className="py-2">
              {/* Users */}
              {results.users.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                     <UserIcon className="w-4 h-4" /> Users
                  </div>
                  {results.users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/secret-admin/users?id=${user.id}`}
                      className="block px-4 py-2 hover:bg-white/10 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="font-medium text-white">{user.username}</div>
                      <div className="text-xs text-gray-400">ID: {user.id}</div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Tracks */}
              {results.tracks.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-t border-white/5 pt-4">
                     <Music className="w-4 h-4" /> Tracks
                  </div>
                  {results.tracks.map((track) => (
                    <Link
                      key={track.id}
                      href={`/secret-admin/tracks?id=${track.id}`}
                      className="block px-4 py-2 hover:bg-white/10 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="font-medium text-white">{track.title}</div>
                      <div className="text-xs text-gray-400">
                         {track.artists.map((a) => a.name).join(", ")} • Uploaded by {track.user?.username}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Artists */}
              {results.artists.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-t border-white/5 pt-4">
                     <Mic2 className="w-4 h-4" /> Artists
                  </div>
                  {results.artists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/secret-admin/artists?id=${artist.id}`}
                      className="block px-4 py-2 hover:bg-white/10 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="font-medium text-white">{artist.name}</div>
                      <div className="text-xs text-gray-400">ID: {artist.id}</div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Playlists */}
              {results.playlists.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-t border-white/5 pt-4">
                     <ListMusic className="w-4 h-4" /> Playlists
                  </div>
                  {results.playlists.map((playlist) => (
                    <Link
                      key={playlist.id}
                      href={`/secret-admin/playlists?id=${playlist.id}`}
                      className="block px-4 py-2 hover:bg-white/10 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="font-medium text-white">{playlist.name}</div>
                      <div className="text-xs text-gray-400">
                         Created by {playlist.user?.username} • {playlist._count?.tracks} tracks
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}