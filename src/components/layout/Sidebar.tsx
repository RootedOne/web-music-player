"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Library, Plus, LogOut, Music, Compass, Search, ListMusic, Mic } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type Playlist = { id: string; name: string };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    router.push(`/?q=${encodeURIComponent(val)}`);
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

      {/* --- Mobile Floating Bottom Nav (Apple Music Inspired) --- */}
      <div className="md:hidden fixed bottom-2 inset-x-0 z-[60] flex items-center justify-center pointer-events-none px-4">
        {/* Pointer-events-auto re-enabled on the inner container so clicks work, but clicks outside pass through */}
        <div className="w-full max-w-md flex items-center justify-between gap-2 h-[60px] pointer-events-auto relative">

           {/* STATE A: Normal Nav Pill */}
           <div
             className={`flex items-center justify-around h-full bg-neutral-900/80 backdrop-blur-md saturate-[180%] rounded-full px-2 overflow-hidden transition-all duration-300 ease-out border border-white/10 shadow-2xl flex-grow ${searchMode ? 'opacity-0 scale-95 pointer-events-none absolute w-[80%]' : 'opacity-100 scale-100 relative'}`}
           >
              <Link href="/" onClick={() => setSearchMode(false)} className="flex flex-col items-center justify-center gap-1 w-16 h-full cursor-pointer">
                 <Compass className={`w-5 h-5 transition-colors ${pathname === '/' ? 'text-white' : 'text-gray-400'}`} />
                 <span className={`text-[10px] font-medium transition-colors ${pathname === '/' ? 'text-white' : 'text-gray-400'}`}>Discover</span>
              </Link>

              <Link href="/library" onClick={() => setSearchMode(false)} className="flex flex-col items-center justify-center gap-1 w-16 h-full cursor-pointer">
                 <Library className={`w-5 h-5 transition-colors ${pathname === '/library' ? 'text-white' : 'text-gray-400'}`} />
                 <span className={`text-[10px] font-medium transition-colors ${pathname === '/library' ? 'text-white' : 'text-gray-400'}`}>Library</span>
              </Link>

              <Link href="/playlists" onClick={() => setSearchMode(false)} className="flex flex-col items-center justify-center gap-1 w-16 h-full cursor-pointer">
                 <ListMusic className={`w-5 h-5 transition-colors ${pathname.includes('/playlists') ? 'text-white' : 'text-gray-400'}`} />
                 <span className={`text-[10px] font-medium transition-colors ${pathname.includes('/playlists') ? 'text-white' : 'text-gray-400'}`}>Playlists</span>
              </Link>
           </div>

           {/* STATE B: Home Button (Replaces Nav Pill when searching) */}
           <button
             onClick={() => { setSearchMode(false); setSearchQuery(""); router.push("/"); }}
             className={`flex items-center justify-center h-full bg-neutral-900/80 backdrop-blur-md saturate-[180%] rounded-full shrink-0 transition-all duration-300 ease-out border border-white/10 shadow-2xl ${searchMode ? 'w-[60px] opacity-100 scale-100 relative' : 'opacity-0 scale-95 pointer-events-none absolute w-[60px]'}`}
           >
              <Home className="w-5 h-5 text-white" />
           </button>

           {/* STATE B: Search Bar (Expands) */}
           <div
             className={`flex items-center h-full bg-neutral-900/80 backdrop-blur-md saturate-[180%] rounded-full px-4 overflow-hidden transition-all duration-300 ease-out border border-white/10 shadow-2xl flex-grow ${searchMode ? 'opacity-100 scale-100 relative' : 'opacity-0 scale-95 pointer-events-none absolute right-16 w-[80%]'}`}
           >
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                 type="text"
                 value={searchQuery}
                 onChange={handleSearch}
                 placeholder="Search..."
                 className="w-full bg-transparent border-none text-white text-sm focus:outline-none px-3"
                 autoFocus={searchMode}
              />
              <Mic className="w-5 h-5 text-white shrink-0" />
           </div>

           {/* STATE A: Search Trigger Button (Right) */}
           <button
             onClick={() => { setSearchMode(true); router.push("/"); }}
             className={`flex items-center justify-center h-full bg-neutral-900/80 backdrop-blur-md saturate-[180%] rounded-full shrink-0 transition-all duration-300 ease-out border border-white/10 shadow-2xl ${!searchMode ? 'w-[60px] opacity-100 scale-100 relative' : 'opacity-0 scale-95 pointer-events-none absolute right-0 w-[60px]'}`}
           >
              <Search className="w-5 h-5 text-white" />
           </button>
        </div>
      </div>
    </>
  );
}
