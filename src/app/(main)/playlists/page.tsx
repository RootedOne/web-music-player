"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Search as SearchIcon, Music, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Playlist = {
  id: string;
  name: string;
  coverUrl: string | null;
  userId: string;
  _count?: { tracks: number };
  user?: { username: string }; // Depending on how the API populates it, it might not be there for owned ones unless updated
};

export default function PlaylistsIndexPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        setPlaylists(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    const name = window.prompt("Enter new playlist name:");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists([newPlaylist, ...playlists]);
        toast.success("Playlist created!");
        router.push(`/playlists/${newPlaylist.id}`);
      } else {
        toast.error("Failed to create playlist.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error creating playlist.");
    }
  };

  const filteredPlaylists = playlists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-32">

      {/* Header Area */}
      <header className="flex items-end justify-between mb-6">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Playlists</h1>

        <div className="flex items-center bg-[#1c1c1e]/80 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm border border-white/5 gap-2 shrink-0">
          <button
            onClick={handleCreatePlaylist}
            className="p-1.5 text-white hover:text-gray-300 transition-colors focus:outline-none"
            aria-label="Create Playlist"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="w-[1px] h-4 bg-gray-600/50 mx-1"></div>
          <button
            className="p-1.5 text-white hover:text-gray-300 transition-colors focus:outline-none"
            aria-label="More Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative w-full mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3 bg-[#1c1c1e] border border-transparent rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-sm transition-all text-base"
          placeholder="Search your playlists"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List View */}
      {isLoading ? (
        <div className="flex justify-center py-12">
           <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">You don&apos;t have any playlists yet.</p>
          <button onClick={handleCreatePlaylist} className="mt-4 text-white font-semibold underline hover:text-gray-300">Create one now</button>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No playlists match &quot;{searchQuery}&quot;</p>
      ) : (
        <div className="flex flex-col">
          {filteredPlaylists.map((pl, index) => {
            const isLast = index === filteredPlaylists.length - 1;
            const trackCount = pl._count?.tracks || 0;
            const secondaryText = pl.user?.username ? `By ${pl.user.username}` : `${trackCount} song${trackCount !== 1 ? 's' : ''}`;

            return (
              <div key={pl.id} className="relative group">
                <Link
                  href={`/playlists/${pl.id}`}
                  className="flex items-center w-full py-3 hover:bg-[#1c1c1e]/50 transition-colors rounded-lg -mx-2 px-2"
                >
                  {/* Artwork (Left) */}
                  <div className="w-14 h-14 bg-[#282828] rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm shrink-0 border border-white/5">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-gray-500" />
                    )}
                  </div>

                  {/* Text Container (Middle) */}
                  <div className="flex flex-col flex-1 min-w-0 ml-4 pr-4">
                    <span className="text-white text-[17px] font-semibold truncate tracking-tight">{pl.name}</span>
                    <span className="text-gray-400 text-[13px] truncate mt-0.5">{secondaryText}</span>
                  </div>

                  {/* Indicator (Right) */}
                  <div className="shrink-0 flex items-center justify-end w-8">
                    <ChevronRight className="w-5 h-5 text-[#5c5c5e]" />
                  </div>
                </Link>

                {/* iOS Separator Line (skips artwork, approx 56px + 16px margin = 72px) */}
                {!isLast && (
                   <div className="absolute bottom-0 left-[72px] right-0 h-[1px] bg-[#282828] pointer-events-none group-hover:opacity-0 transition-opacity"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
