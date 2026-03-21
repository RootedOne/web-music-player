"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Trash2, Play, Pause, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { usePlayerStore } from "@/store/playerStore";
import { useSession } from "next-auth/react";

type TrackType = { id: string; title: string; artist: string | null; album: string | null; duration: number };
type PlaylistTrackType = { id: string; trackId: string; track: TrackType };
type PlaylistType = { id: string; name: string; tracks: PlaylistTrackType[], userId: string, user: { username: string } };

export default function PlaylistPage() {
  const params = useParams();
  const [playlist, setPlaylist] = useState<PlaylistType | null>(null);
  const [allTracks, setAllTracks] = useState<TrackType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { playQueue, currentTrackIndex, queue, isPlaying, pause, resume } = usePlayerStore();
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
  }, [searchQuery, isAdding]);

  // eslint-disable-next-line react-hooks/exhaustive-deps

  const deletePlaylist = async () => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/";
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
      setIsAdding(false);
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

  const copyShareLink = () => {
    const url = `${window.location.origin}/playlists/${playlistId}`;
    navigator.clipboard.writeText(url);
    alert("Playlist link copied to clipboard!");
  };

  if (!playlist) return <MainLayout><div className="p-8">Loading...</div></MainLayout>;

  const isCurrentPlaylistPlaying = queue.length === playlist.tracks.length &&
    queue.every((t, i) => t.id === playlist.tracks[i]?.track.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = session?.user && (session.user as any).id === playlist.userId;

  return (
    <MainLayout>
      <header className="flex items-end gap-6 mb-8 mt-12">
        <div className="w-48 h-48 bg-gray-800 shadow-2xl flex items-center justify-center rounded-md">
           <span className="text-gray-500 font-bold text-xl">Playlist</span>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <span className="text-sm font-bold uppercase tracking-widest text-gray-300">Playlist</span>
          <h1 className="text-6xl font-black text-white tracking-tighter truncate">{playlist.name}</h1>
          <p className="text-gray-400 mt-2">Created by {playlist.user.username} • {playlist.tracks.length} songs</p>
        </div>
        <div className="flex gap-2">
            <button onClick={copyShareLink} title="Share Playlist" className="mb-2 text-gray-400 hover:text-white transition-colors p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                <Share2 className="w-5 h-5" />
            </button>
            {isOwner && (
                <button onClick={deletePlaylist} title="Delete Playlist" className="mb-2 text-red-400 hover:text-red-300 transition-colors p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                   <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
      </header>

      <div className="flex items-center gap-4 mb-8">
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
          className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg text-black"
        >
          {isCurrentPlaylistPlaying && isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 ml-1 fill-current" />
          )}
        </button>
      </div>

      {/* Tracks Table */}
      <div className="w-full">
        <div className="grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_50px] gap-4 px-4 py-2 text-gray-400 text-sm border-b border-gray-800 mb-4">
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
              className="grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_50px] items-center gap-4 px-4 py-3 hover:bg-gray-800 rounded-md group text-gray-300 text-sm transition-colors cursor-pointer"
            >
              <div className={`text-gray-500 group-hover:hidden ${isThisTrackPlaying ? 'text-green-500' : ''}`}>{index + 1}</div>
              <div
                className="hidden group-hover:block text-white"
                onClick={(e) => { e.stopPropagation(); handlePlayTrack(index); }}
              >
                {isThisTrackPlaying ? <Pause className="w-4 h-4 fill-current text-green-500" /> : <Play className="w-4 h-4 fill-current" />}
              </div>

              <div className="flex flex-col min-w-0">
                <span className={`font-medium truncate ${isThisTrackPlaying ? 'text-green-500' : 'text-white'}`}>{pt.track.title}</span>
                <span className="text-gray-500 truncate">{pt.track.artist}</span>
              </div>
              <div className="truncate text-gray-400">{pt.track.album}</div>

              <div className="flex items-center justify-end gap-3 text-gray-400">
                {isOwner && (
                  <button onClick={(e) => { e.stopPropagation(); removeTrack(pt.track.id); }} className="opacity-0 group-hover:opacity-100 hover:text-white transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <span>{Math.floor(pt.track.duration / 60)}:{(Math.floor(pt.track.duration % 60)).toString().padStart(2, '0')}</span>
              </div>
            </div>
            );
          })
        )}
      </div>

      {isOwner && (
      <div className="mt-12 pt-8 border-t border-gray-800">
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Let&apos;s find something for your playlist</h2>
                <button
                    onClick={() => { setIsAdding(!isAdding); if(!isAdding) fetchAllTracks(); }}
                    className="text-sm font-bold bg-transparent border border-gray-500 text-white px-4 py-1 rounded-full hover:border-white transition"
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
                 className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                                <div className="flex flex-col min-w-0 max-w-[70%]">
                                    <span className="text-white font-medium truncate">{track.title}</span>
                                    <span className="text-gray-400 text-sm truncate">{track.artist}</span>
                                </div>
                                <button
                                    onClick={() => addTrack(track.id)}
                                    disabled={isInPlaylist}
                                    className={`px-3 py-1 text-sm font-bold rounded-full border ${
                                        isInPlaylist
                                        ? "border-gray-600 text-gray-600 cursor-not-allowed"
                                        : "border-gray-400 text-white hover:border-white transition-colors"
                                    }`}
                                >
                                    {isInPlaylist ? "Added" : "Add"}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
