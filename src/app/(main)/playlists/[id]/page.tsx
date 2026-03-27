"use client";

import { useEffect, useState } from "react";
import { Trash2, Play, Pause, Share2, Edit2, Heart, Shuffle, Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { usePlayerStore } from "@/store/playerStore";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import TrackOptions from "@/components/TrackOptions";
import EditModal from "@/components/EditModal";
import ConfirmModal from "@/components/modals/ConfirmModal";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type TrackType = { id: string; title: string; artist: string | null; album: string | null; duration: number; coverUrl: string | null; userId: string; fileUrl: string };
type PlaylistTrackType = { id: string; trackId: string; track: TrackType };
type PlaylistType = { id: string; name: string; coverUrl: string | null, tracks: PlaylistTrackType[], userId: string, user: { username: string }, savedBy?: { id: string }[] };

export default function PlaylistPage() {
  const params = useParams();
  const [playlist, setPlaylist] = useState<PlaylistType | null>(null);
  const [allTracks, setAllTracks] = useState<TrackType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { playQueue, currentTrackIndex, queue, isPlaying, pause, resume, toggleShuffle, isShuffle } = usePlayerStore();
  const { data: session } = useSession();

  const playlistId = params.id as string;

  useEffect(() => {
    fetchPlaylist();
    fetchAllTracks();
  }, [playlistId]);

  const fetchPlaylist = async () => {
    if (!playlistId) return;
    const res = await fetch(`/api/playlists/${playlistId}`);
    if (res.ok) {
      setPlaylist(await res.json());
    }
  };

  const fetchAllTracks = async (query: string = "") => {
    const searchParam = query ? `&search=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/tracks?filter=global${searchParam}`);
    if (res.ok) {
      const data = await res.json();
      setAllTracks(data.tracks);
    }
  };

  useEffect(() => {
    if(isAdding) {
      const delayDebounceFn = setTimeout(() => {
        fetchAllTracks(searchQuery);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isAdding]);

  // eslint-disable-next-line react-hooks/exhaustive-deps

  const deletePlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      }
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    if (res.ok) fetchPlaylist();
  };

  const addTrack = async (trackId: string) => {
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    if (res.ok) {
      fetchPlaylist();
    }
  };

  const handlePlayPlaylist = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracksToPlay = playlist.tracks.map((pt: PlaylistTrackType) => pt.track as unknown as TrackType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playQueue(tracksToPlay as any, 0);
  };

  const handlePlayTrack = (startIndex: number) => {
    if (!playlist) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracksToPlay = playlist.tracks.map((pt: PlaylistTrackType) => pt.track as unknown as TrackType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playQueue(tracksToPlay as any, startIndex);
  };

  const toggleSavePlaylist = async () => {
    if (!playlist) return;
    const isSaved = playlist.savedBy && playlist.savedBy.length > 0;

    try {
        const res = await fetch(`/api/playlists/${playlistId}/save`, {
            method: isSaved ? "DELETE" : "POST"
        });
        if(res.ok) {
            fetchPlaylist();
            toast.success(isSaved ? "Removed from Library" : "Added to Library");
        }
    } catch(err) {
        console.error(err);
    }
  };

  const saveAsCopy = async () => {
    if (!playlist) return;
    try {
        const res = await fetch(`/api/playlists/${playlistId}/clone`, {
            method: "POST"
        });
        if(res.ok) {
            const newPlaylist = await res.json();
            toast.success("Playlist saved as copy!");
            window.location.href = `/playlists/${newPlaylist.id}`;
        } else {
            toast.error("Failed to copy playlist.");
        }
    } catch(err) {
        console.error(err);
        toast.error("Failed to copy playlist.");
    }
  };

  const downloadPlaylist = async () => {
    if (!playlist || playlist.tracks.length === 0) {
      toast.error("Playlist is empty.");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("Zipping playlist...");
    try {
      const zip = new JSZip();

      // Fetch all blobs in parallel
      const blobPromises = playlist.tracks.map(async (pt, idx) => {
        const response = await fetch(pt.track.fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${pt.track.title}`);
        const blob = await response.blob();

        // ensure a neat filename
        const ext = pt.track.fileUrl.split('.').pop() || 'mp3';
        const paddedIdx = String(idx + 1).padStart(2, '0');
        const filename = `${paddedIdx}. ${pt.track.title}.${ext}`;

        zip.file(filename, blob);
      });

      await Promise.all(blobPromises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${playlist.name}.zip`);
      toast.success("Playlist downloaded!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download playlist.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/playlists/${playlistId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Playlist link copied to clipboard!");
      }).catch((err) => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      // Fallback for older browsers or HTTP environments
      const textArea = document.createElement("textarea");
      textArea.value = url;
      // Avoid scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success("Playlist link copied to clipboard!");
        } else {
          console.error("Fallback copy command was unsuccessful");
        }
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }
  };

  if (!playlist) return <div className="p-8">Loading...</div>;

  const isCurrentPlaylistPlaying = queue.length === playlist.tracks.length &&
    queue.every((t, i) => t.id === playlist.tracks[i]?.track.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = session?.user && (session.user as any).id === playlist.userId;
  const isSaved = playlist.savedBy && playlist.savedBy.length > 0;

  return (
    <>
      <header className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-12 text-center md:text-left">
        <div className="w-48 h-48 bg-[#282828] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center justify-center rounded-md shrink-0 overflow-hidden relative">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : playlist.tracks.length > 0 && playlist.tracks[0].track.coverUrl ? (
            <img src={playlist.tracks[0].track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 font-bold text-xl">Playlist</span>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 w-full overflow-hidden">
          <span className="text-sm font-bold uppercase tracking-widest text-gray-300">Playlist</span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter truncate w-full">{playlist.name}</h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">Created by {playlist.user.username} • {playlist.tracks.length} songs</p>

          {session?.user && !isOwner && (
            <div className="mt-4 flex flex-col gap-2 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={toggleSavePlaylist}
                  className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 ${isSaved ? 'bg-[#282828] text-white hover:bg-[#383838]' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? "fill-white" : ""}`} />
                  {isSaved ? "Added to Library" : "Add to Library"}
                </button>
                <button
                  onClick={saveAsCopy}
                  className="px-6 py-2 rounded-full font-bold text-sm bg-transparent border border-gray-500 text-white hover:border-white transition-colors active:scale-95 flex items-center gap-2"
                >
                  Save as Copy
                </button>
              </div>
              <p className="text-[#a0a0a0] text-xs">Add to get live updates, or Save a copy to edit yourself.</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center w-full md:w-auto justify-center md:justify-start mt-4 md:mt-0">
            <button onClick={downloadPlaylist} disabled={isDownloading} title="Download Playlist" className="text-gray-400 hover:text-white transition-colors p-2 bg-[#282828] rounded-full hover:bg-[#383838] shadow-md disabled:opacity-50">
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button onClick={copyShareLink} title="Share Playlist" className="text-gray-400 hover:text-white transition-colors p-2 bg-[#282828] rounded-full hover:bg-[#383838] shadow-md">
                <Share2 className="w-5 h-5" />
            </button>
            {isOwner && (
              <>
                <button onClick={() => setIsEditing(true)} title="Edit Playlist" className="text-white hover:text-gray-300 transition-colors p-2 bg-[#282828] rounded-full hover:bg-[#383838] shadow-md">
                   <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => setIsDeleteConfirmOpen(true)} title="Delete Playlist" className="text-red-400 hover:text-red-300 transition-colors p-2 bg-[#282828] rounded-full hover:bg-[#383838] shadow-md">
                   <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
        </div>
      </header>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deletePlaylist}
        title="Delete Playlist?"
        description="Are you sure you want to delete this playlist? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />

      {isEditing && (
         <EditModal
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSuccess={fetchPlaylist}
            title="Edit Playlist Details"
            endpoint={`/api/playlists/${playlistId}`}
            initialName={playlist.name}
            nameFieldLabel="Playlist Name"
            nameFieldKey="name"
         />
      )}

      <div className="flex items-center justify-center md:justify-start gap-6 mb-8 mt-2">
        <button
          onClick={() => {
            if (isCurrentPlaylistPlaying && isPlaying) {
              pause();
            } else if (isCurrentPlaylistPlaying && !isPlaying) {
              resume();
            } else {
              handlePlayPlaylist();
            }
          }}
          className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg text-black"
        >
          {isCurrentPlaylistPlaying && isPlaying ? (
            <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" />
          ) : (
            <Play className="w-6 h-6 md:w-8 md:h-8 ml-1 fill-current" />
          )}
        </button>

        <button
          onClick={() => {
            if (!isCurrentPlaylistPlaying) handlePlayPlaylist();
            toggleShuffle();
          }}
          className={`p-3 rounded-full hover:scale-105 active:scale-95 transition relative ${isShuffle ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          title="Shuffle Play"
        >
          <Shuffle className="w-6 h-6 md:w-8 md:h-8" />
          {isShuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></span>}
        </button>
      </div>

      {/* Tracks Table */}
      <div className="w-full">
        <div className="hidden md:grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_50px] gap-4 px-4 py-2 text-gray-400 text-sm border-b border-gray-800 mb-4 uppercase tracking-wider font-semibold">
          <div>#</div>
          <div>Title</div>
          <div>Album</div>
          <div className="text-right">Time</div>
        </div>

        {playlist.tracks.length === 0 ? (
           <div className="text-center text-gray-500 py-12">No tracks in this playlist yet.</div>
        ) : (
          playlist.tracks.map((pt: PlaylistTrackType, index: number) => {
            const isThisTrackPlaying = isCurrentPlaylistPlaying && currentTrackIndex === index && isPlaying;

            return (
            <div
              key={pt.id}
              onDoubleClick={() => handlePlayTrack(index)}
              className="grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_50px] md:grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_50px] items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 hover:bg-gray-800 rounded-md group text-gray-300 text-sm transition-colors cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-6 h-6 md:w-auto md:h-auto">
                  <div className={`text-gray-500 group-hover:hidden ${isThisTrackPlaying ? 'text-white font-bold' : ''}`}>{index + 1}</div>
                  <div
                    className="hidden group-hover:block text-white absolute inset-0 flex items-center justify-center bg-gray-800/80 rounded"
                    onClick={(e) => { e.stopPropagation(); handlePlayTrack(index); }}
                  >
                    {isThisTrackPlaying ? <Pause className="w-3 h-3 md:w-4 md:h-4 fill-current text-white" /> : <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />}
                  </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                {pt.track.coverUrl && (
                  <img src={pt.track.coverUrl} alt="Cover" className="w-10 h-10 object-cover rounded hidden sm:block bg-[#282828] shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className={`font-medium truncate ${isThisTrackPlaying ? 'text-white font-bold' : 'text-white'}`}>{pt.track.title}</span>
                  <span className="text-gray-500 text-xs md:text-sm truncate">{pt.track.artist}</span>
                </div>
              </div>
              <div className="hidden md:block truncate text-gray-400 pr-4">{pt.track.album}</div>

              <div className="flex items-center justify-end gap-1 md:gap-2 text-gray-400">
                <span className="hidden sm:block tabular-nums text-xs md:text-sm mr-2">{Math.floor(pt.track.duration / 60)}:{(Math.floor(pt.track.duration % 60)).toString().padStart(2, '0')}</span>
                <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                   <TrackOptions
                      trackId={pt.track.id}
                      trackOwnerId={pt.track.userId}
                      fileUrl={pt.track.fileUrl}
                      trackTitle={pt.track.title}
                      onRemoveFromPlaylist={isOwner ? () => removeTrack(pt.track.id) : undefined}
                   />
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {isOwner && (
      <div className="mt-8 md:mt-12 pt-8 border-t border-gray-800">
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white">Let&apos;s find something for your playlist</h2>
                <button
                    onClick={() => { setIsAdding(!isAdding); if(!isAdding) fetchAllTracks(); }}
                    className="text-sm font-bold bg-transparent border border-gray-500 text-white px-6 py-2 rounded-full hover:border-white hover:scale-105 active:scale-95 transition-all self-start sm:self-auto"
                >
                    {isAdding ? "Close" : "Add tracks"}
                </button>
            </div>
            {isAdding && (
               <input
                 type="text"
                 placeholder="Search globally for songs to add..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 autoFocus
                 className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#fa243c] transition-colors"
               />
            )}
        </div>

        {isAdding && (
            <div className="bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {allTracks.length === 0 ? (
                    <p className="text-gray-400 text-sm">No matching tracks found on the platform.</p>
                ) : (
                    allTracks.map((track) => {
                        const isInPlaylist = playlist.tracks.some((pt: PlaylistTrackType) => pt.trackId === track.id);
                        return (
                            <div key={track.id} className="flex items-center justify-between py-2 px-4 hover:bg-gray-700 rounded-md group">
                                <div className="flex items-center gap-3 min-w-0 max-w-[70%]">
                                    {track.coverUrl ? (
                                        <img src={track.coverUrl} className="w-10 h-10 rounded object-cover bg-[#282828]" alt="Cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center text-xs">MP3</div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-white font-medium truncate">{track.title}</span>
                                        <span className="text-gray-400 text-sm truncate">{track.artist}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => isInPlaylist ? removeTrack(track.id) : addTrack(track.id)}
                                    className={`px-4 py-1 text-sm font-bold rounded-full border transition-all ${
                                        isInPlaylist
                                        ? "border-red-500/50 text-red-500 hover:border-red-500 hover:bg-red-500/10"
                                        : "border-gray-400 text-white hover:border-white hover:scale-105 active:scale-95"
                                    }`}
                                >
                                    {isInPlaylist ? "Remove" : "Add"}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        )}
      </div>
      )}
    </>
  );
}
