"use client";

import { useState, useEffect } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { Mic2, Edit2, Trash2, Image as ImageIcon, Music2 } from "lucide-react";
import toast from "react-hot-toast";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
  _count: {
    tracks: number;
  };
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  // Form State
  const [editName, setEditName] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/artists");
      if (res.ok) {
        const data = await res.json();
        setArtists(data);
      }
    } catch (error) {
      console.error("Failed to fetch artists", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setEditName(artist.name);
    setEditImageFile(null); // Reset file input
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingArtist(null);
  };

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", editingArtist.id);
    formData.append("name", editName);

    if (editImageFile) {
      formData.append("image", editImageFile);
    }

    try {
      const res = await fetch("/api/admin/artists", {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        const updatedArtist = await res.json();
        setArtists((prev) =>
          prev.map((a) => (a.id === updatedArtist.id ? updatedArtist : a))
        );
        toast.success("Artist updated successfully");
        closeEditModal();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update artist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating artist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArtist = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete artist "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/artists?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setArtists((prev) => prev.filter((a) => a.id !== id));
        toast.success("Artist deleted successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to delete artist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting artist");
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Artists</h1>
          <p className="text-gray-400">Manage artist profiles and cover art.</p>
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
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tracks</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {artists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex flex-shrink-0 items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                        {artist.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <Mic2 className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white max-w-[250px] truncate">{artist.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-300">
                         <Music2 className="w-4 h-4 text-gray-500" />
                         {artist._count.tracks}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(artist)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArtist(artist.id, artist.name)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {artists.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No artists found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-4">
            {artists.map((artist) => (
              <div key={artist.id} className="bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
                    {artist.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{artist.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">{artist._count.tracks} tracks</div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openEditModal(artist)}
                    className="flex-1 py-2 bg-white/5 active:bg-white/10 text-gray-300 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteArtist(artist.id, artist.name)}
                    className="flex-1 py-2 bg-red-500/10 active:bg-red-500/20 text-red-500 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {artists.length === 0 && (
              <div className="py-10 text-center text-gray-500">
                No artists found.
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Artist"
      >
        <form onSubmit={handleUpdateArtist} className="space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">
              Replace Avatar Image <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setEditImageFile(e.target.files[0]);
                }
              }}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-white/5 file:text-white
                hover:file:bg-white/10
                file:transition-all cursor-pointer bg-black/30 border border-white/10 rounded-xl p-1"
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