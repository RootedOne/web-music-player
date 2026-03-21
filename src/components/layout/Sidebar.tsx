"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Plus, LogOut, Music } from "lucide-react";
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
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 text-white font-bold text-xl mb-8">
          <Music className="w-8 h-8 text-blue-500" />
          <span>Music Player</span>
        </Link>

        <nav className="space-y-2">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              pathname === "/" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <Link
            href="/library"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              pathname === "/library" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Library className="w-5 h-5" />
            <span>Your Library</span>
          </Link>
        </nav>
      </div>

      <div className="px-6 py-4 border-t border-gray-800 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 text-gray-400">
          <span className="text-sm font-semibold uppercase tracking-wider">Playlists</span>
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
              className="w-full px-3 py-1 bg-gray-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>
        )}

        <ul className="space-y-2 text-sm">
          {playlists.map((pl) => (
            <li key={pl.id}>
              <Link
                href={`/playlists/${pl.id}`}
                className={`block px-3 py-2 rounded-md transition-colors truncate ${pathname === `/playlists/${pl.id}` ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                {pl.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 w-full rounded-md transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
