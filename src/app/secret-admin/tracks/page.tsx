"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { Music, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams, useRouter } from "next/navigation";

interface Track {
  id: string;
  title: string;
  album: string | null;
  coverUrl: string | null;
  createdAt: string;
  artists: { id: string; name: string }[];
  user: { username: string };
}

interface ArtistOption {
  id: string;
  name: string;
}

export default function AdminTracksPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fa243c]"></div>
      </div>
    }>
      <AdminTracksContent />
    </Suspense>
  );
}

function AdminTracksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedId = searchParams.get("id");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistsList, setArtistsList] = useState<ArtistOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  // Form State
  const [editTitle, setEditTitle] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editArtistId, setEditArtistId] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel fetch tracks and available artists for the edit modal
      // If requestedId exists, it passes it to the backend to ensure it's in the list
      const fetchUrl = requestedId ? `/api/admin/tracks?id=${requestedId}` : "/api/admin/tracks";

      const [tracksRes, artistsRes] = await Promise.all([
        fetch(fetchUrl),
        fetch("/api/admin/artists") // We can reuse the artist GET endpoint
      ]);

      if (tracksRes.ok) {
        const fetchedTracks = await tracksRes.json();
        setTracks(fetchedTracks);

        // Auto-open modal logic
        if (requestedId && !hasAutoOpened) {
          const targetTrack = fetchedTracks.find((t: Track) => t.id === requestedId);
          if (targetTrack) {
            setEditingTrack(targetTrack);
            setEditTitle(targetTrack.title);
            setEditAlbum(targetTrack.album || "");
            setEditArtistId(targetTrack.artists?.[0]?.id || "");
            setEditCoverFile(null);
            setIsEditModalOpen(true);
            setHasAutoOpened(true);
          }
        }
      }
      if (artistsRes.ok) {
        const artistData: { id: string; name: string }[] = await artistsRes.json();
        setArtistsList(artistData.map((a) => ({ id: a.id, name: a.name })));
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  }, [requestedId, hasAutoOpened]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditAlbum(track.album || "");
    // Default to the first artist relation if exists
    setEditArtistId(track.artists?.[0]?.id || "");
    setEditCoverFile(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTrack(null);
    if (requestedId) {
      router.replace("/secret-admin/tracks", { scroll: false });
    }
  };

  const handleUpdateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;

    if (!editArtistId) {
      toast.error("Please select an artist.");
      return;
    }

    setIsSubmitting(true);

    try {
      let coverUrl = undefined;
      if (editCoverFile) {
        const presignRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: [{ name: editCoverFile.name, type: editCoverFile.type || "image/jpeg" }]
          })
        });

        if (!presignRes.ok) throw new Error("Failed to get upload URL");

        const { urls } = await presignRes.json();
        const uploadInfo = urls[0];

        const uploadRes = await fetch(uploadInfo.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": editCoverFile.type || "image/jpeg" },
          body: editCoverFile
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image to cloud");
        coverUrl = uploadInfo.publicUrl;
      }

      const payload: Record<string, string> = {
        id: editingTrack.id,
        title: editTitle,
        album: editAlbum,
        artistId: editArtistId,
      };

      if (coverUrl) {
        payload.coverUrl = coverUrl;
      }

      const res = await fetch("/api/admin/tracks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedTrack = await res.json();
        setTracks((prev) =>
          prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t))
        );
        toast.success("Track updated successfully");
        closeEditModal();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update track");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating track");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrack = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to completely delete "${title}"? This will physically remove the audio file and cover image from the server.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tracks?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTracks((prev) => prev.filter((t) => t.id !== id));
        toast.success("Track deleted successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to delete track");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting track");
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Tracks</h1>
          <p className="text-gray-400">Manage uploaded tracks, relations, and physical files.</p>
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
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artist</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex flex-shrink-0 items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                        {track.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white max-w-[200px] truncate">{track.title}</div>
                        {track.album && (
                          <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{track.album}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-300">
                        {track.artists.map(a => a.name).join(", ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                        @{track.user.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(track)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track.id, track.title)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tracks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No tracks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-4">
            {tracks.map((track) => (
              <div key={track.id} className="bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
                    {track.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{track.title}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{track.artists.map(a => a.name).join(", ")}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Uploaded by @{track.user.username}</div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openEditModal(track)}
                    className="flex-1 py-2 bg-white/5 active:bg-white/10 text-gray-300 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTrack(track.id, track.title)}
                    className="flex-1 py-2 bg-red-500/10 active:bg-red-500/20 text-red-500 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {tracks.length === 0 && (
              <div className="py-10 text-center text-gray-500">
                No tracks found.
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Track"
      >
        <form onSubmit={handleUpdateTrack} className="space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Album <span className="text-xs text-gray-500 font-normal">(optional)</span></label>
            <input
              type="text"
              value={editAlbum}
              onChange={(e) => setEditAlbum(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">Relational Artist <span className="text-xs text-gray-500 font-normal">(Required)</span></label>
            <select
              value={editArtistId}
              onChange={(e) => setEditArtistId(e.target.value)}
              required
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c] focus:border-transparent transition-all"
            >
              <option value="" disabled>Select an Artist</option>
              {artistsList.map(artist => (
                <option key={artist.id} value={artist.id}>{artist.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 pl-1">
              Replace Cover Art <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setEditCoverFile(e.target.files[0]);
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