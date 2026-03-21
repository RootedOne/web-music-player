"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Plus, LogOut, Music, Compass, ListMusic } from "lucide-react";
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
      <aside className="hidden md:flex inset-y-0 left-0 z-50 w-64 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl flex-col h-[calc(100vh-2rem)] shadow-2xl m-4 mt-0 mr-0">
        <div className="p-6 pt-8">
          <Link href="/" className="flex items-center gap-3 text-white font-bold text-2xl tracking-tighter mb-10 hover:opacity-80 transition-opacity">
            <Music className="w-8 h-8 text-white" />
            <span>Sepatifay</span>
          </Link>

          <nav className="space-y-2">
            <Link
              href="/"
              className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all ${
                pathname === "/" ? "bg-white/10 text-white font-semibold shadow-inner border border-white/5" : "text-neutral-400 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>Discover</span>
            </Link>
            <Link
              href="/library"
              className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all ${
                pathname === "/library" ? "bg-white/10 text-white font-semibold shadow-inner border border-white/5" : "text-neutral-400 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <Library className="w-5 h-5" />
              <span>Your Library</span>
            </Link>
            <Link
              href="/playlists"
              className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all ${
                pathname.includes("/playlists") ? "bg-white/10 text-white font-semibold shadow-inner border border-white/5" : "text-neutral-400 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <ListMusic className="w-5 h-5" />
              <span>Playlists</span>
            </Link>
          </nav>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Playlists</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
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
                className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-white transition-all shadow-inner"
              />
            </form>
          )}

          <ul className="space-y-1 text-sm">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <Link
                  href={`/playlists/${pl.id}`}
                  className={`block px-4 py-2.5 rounded-xl transition-all truncate font-medium ${pathname === `/playlists/${pl.id}` ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  {pl.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 border-t border-white/10 mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-white hover:bg-white/5 w-full rounded-full transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- Mobile Floating Bottom Nav (Glassmorphism) --- */}
      <div className="md:hidden fixed bottom-6 inset-x-0 z-[60] flex justify-center pointer-events-none px-4">
        <div className="w-full max-w-sm h-[64px] bg-neutral-800/40 backdrop-blur-2xl saturate-[180%] border border-white/10 shadow-2xl rounded-full flex items-center justify-between px-2 pointer-events-auto">
            <Link href="/" className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer gap-1 transition-all ${pathname === '/' ? 'text-white scale-105' : 'text-neutral-400 hover:text-neutral-300'}`}>
                <Compass className="w-6 h-6" />
                <span className="text-[10px] font-semibold tracking-wide">Discover</span>
            </Link>

            <Link href="/library" className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer gap-1 transition-all ${pathname === '/library' ? 'text-white scale-105' : 'text-neutral-400 hover:text-neutral-300'}`}>
                <Library className="w-6 h-6" />
                <span className="text-[10px] font-semibold tracking-wide">Library</span>
            </Link>

            <Link href="/playlists" className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer gap-1 transition-all ${pathname.includes('/playlists') ? 'text-white scale-105' : 'text-neutral-400 hover:text-neutral-300'}`}>
                <ListMusic className="w-6 h-6" />
                <span className="text-[10px] font-semibold tracking-wide">Playlists</span>
            </Link>
        </div>
      </div>
    </>
  );
}
