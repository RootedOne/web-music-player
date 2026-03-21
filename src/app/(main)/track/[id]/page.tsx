"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useParams } from "next/navigation";
import { usePlayerStore, Track } from "@/store/playerStore";
import TrackOptions from "@/components/TrackOptions";

export default function SharedTrackPage() {
  const params = useParams();
  const [track, setTrack] = useState<(Track & { userId: string, user: { username: string } }) | null>(null);
  const { play } = usePlayerStore();

  const trackId = params.id as string;

  useEffect(() => {
    fetchTrack();
  }, [trackId]);

  const fetchTrack = async () => {
    if (!trackId) return;
    const res = await fetch(`/api/tracks/${trackId}`);
    if (res.ok) {
      setTrack(await res.json());
    }
  };

  if (!track) return <div className="p-8">Loading track...</div>;

  return (
    <>
      <header className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-12 text-center md:text-left">
        <div className="w-48 h-48 bg-[#282828] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center justify-center rounded-md shrink-0 relative overflow-hidden">
           {track.coverUrl ? (
             <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
           ) : (
             <span className="text-gray-500 font-bold text-3xl">MP3</span>
           )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <span className="text-sm font-bold uppercase tracking-widest text-gray-300">Single Track</span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter line-clamp-2">{track.title}</h1>
          <p className="text-gray-400 mt-2 text-lg">{track.artist || "Unknown Artist"}</p>
          <p className="text-gray-500 text-sm mt-1">Uploaded by {track.user.username}</p>
        </div>
      </header>

      <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
        <button
          onClick={() => play(track)}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg text-black"
        >
          <Play className="w-8 h-8 ml-1 fill-current" />
        </button>
        <div className="bg-gray-800 rounded-full p-2">
           <TrackOptions trackId={track.id} trackOwnerId={track.userId || ""} />
        </div>
      </div>
    </>
  );
}
