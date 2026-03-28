"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { ListMusic, Edit2, Trash2, Image as ImageIcon, Music2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams, useRouter } from "next/navigation";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: string;
  user: {
    username: string;
  };
  _count: {
    tracks: number;
  };
}

export default function AdminPlaylistsPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fa243c]"></div>
      </div>
    }>
      <AdminPlaylistsContent />
    </Suspense>
  );
}

function AdminPlaylistsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedId = searchParams.get("id");

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Form State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchUrl = requestedId ? `/api/admin/playlists?id=${requestedId}` : "/api/admin/playlists";
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);

        // Auto-open modal logic
        if (requestedId && !hasAutoOpened) {
          const targetPlaylist = data.find((p: Playlist) => p.id === requestedId);
          if (targetPlaylist) {
            setEditingPlaylist(targetPlaylist);
            setEditName(targetPlaylist.name);
            setEditDescription(targetPlaylist.description || "");
            setIsEditModalOpen(true);
            setHasAutoOpened(true);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch playlists", error);
    } finally {
      setIsLoading(false);
    }
  }, [requestedId, hasAutoOpened]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const openEditModal = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditDescription(playlist.description || "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPlaylist(null);
    if (requestedId) {
      router.replace("/secret-admin/playlists", { scroll: false });
    }
  };

  const handleUpdatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlaylist) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/playlists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPlaylist.id,
          name: editName,
          description: editDescription,
        }),
      });

      if (res.ok) {
        const updatedPlaylist = await res.json();
        setPlaylists((prev) =>
          prev.map((p) => (p.id === updatedPlaylist.id ? updatedPlaylist : p))
        );
        toast.success("Playlist updated successfully");
        closeEditModal();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update playlist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to forcefully delete playlist "${name}"? This will delete all its track relations and cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/playlists?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== id));
        toast.success("Playlist deleted successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to delete playlist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting playlist");
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Playlists</h1>
          <p className="text-gray-400">Manage user-created playlists and details.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fa243c]"></div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Creator</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tracks</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {playlists.map((playlist) => (
                  <tr key={playlist.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex flex-shrink-0 items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                        {playlist.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white max-w-[200px] truncate">{playlist.name}</div>
                        {playlist.description && (
                          <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{playlist.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                        @{playlist.user.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-300">
                         <Music2 className="w-4 h-4 text-gray-500" />
                         {playlist._count.tracks}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(playlist)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {playlists.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No playlists found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-4">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
                    {playlist.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{playlist.name}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">By @{playlist.user.username}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">{playlist._count.tracks} tracks</div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openEditModal(playlist)}
                    className="flex-1 py-2 bg-white/5 active:bg-white/10 text-gray-300 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                    className="flex-1 py-2 bg-red-500/10 active:bg-red-500/20 text-red-500 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {playlists.length === 0 && (
              <div className="py-10 text-center text-gray-500">
                No playlists found.
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Playlist"
      >
        <form onSubmit={handleUpdatePlaylist} className="space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Playlist Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeEditModal}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-[#fa243c] hover:bg-[#fa243c]/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(250,36,60,0.3)] transition-all"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}