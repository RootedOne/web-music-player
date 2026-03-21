"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Search, Plus, LogOut, Music, Compass, ListMusic } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type Playlist = { id: string; name: string };

export function Sidebar() {
  const pathname = usePathname();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error("Failed to fetch playlists", error);
    }
  };

  const createPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName }),
      });
      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName("");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create playlist", error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex inset-y-0 left-0 z-50 w-64 bg-[#121212] border-r border-gray-800 flex-col h-full">
        <div className="p-6 pt-6">
          <Link href="/" className="flex items-center gap-3 text-white font-bold text-2xl tracking-tighter mb-8 hover:scale-105 transition-transform">
            <Music className="w-8 h-8 text-white" />
            <span>Sepatifay</span>
          </Link>

          <nav className="space-y-2">
            <Link
              href="/"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/" ? "bg-[#282828] text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>Discover</span>
            </Link>
            <Link
              href="/library"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/library" ? "bg-[#282828] text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Library className="w-5 h-5" />
              <span>Your Library</span>
            </Link>
          </nav>
        </div>

        <div className="px-6 py-4 border-t border-gray-800 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 text-gray-400">
            <span className="text-sm font-bold uppercase tracking-wider">Playlists</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isCreating && (
            <form onSubmit={createPlaylist} className="mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onBlur={() => { if(!newPlaylistName) setIsCreating(false); }}
                className="w-full px-3 py-1 bg-gray-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-white"
              />
            </form>
          )}

          <ul className="space-y-2 text-sm">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <Link
                  href={`/playlists/${pl.id}`}
                  className={`block px-3 py-2 rounded-md transition-colors truncate ${pathname === `/playlists/${pl.id}` ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  {pl.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 w-full rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- Mobile Bottom Nav (Spotify Inspired) --- */}
      <div className="md:hidden fixed bottom-0 w-full bg-black/95 backdrop-blur-md border-t border-neutral-800 z-[60] pb-safe">
        <div className="flex items-center justify-between w-full h-[64px]">
            <Link href="/" className={`flex flex-col items-center justify-center w-1/4 h-full cursor-pointer gap-1 transition-colors ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}>
                <Compass className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Discover</span>
            </Link>

            <Link href="/search" className={`flex flex-col items-center justify-center w-1/4 h-full cursor-pointer gap-1 transition-colors ${pathname === '/search' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}>
                <Search className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Search</span>
            </Link>

            <Link href="/library" className={`flex flex-col items-center justify-center w-1/4 h-full cursor-pointer gap-1 transition-colors ${pathname === '/library' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}>
                <Library className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Library</span>
            </Link>

            <Link href="/playlists" className={`flex flex-col items-center justify-center w-1/4 h-full cursor-pointer gap-1 transition-colors ${pathname.includes('/playlists') ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}>
                <ListMusic className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Playlists</span>
            </Link>
        </div>
      </div>
    </>
  );
}
