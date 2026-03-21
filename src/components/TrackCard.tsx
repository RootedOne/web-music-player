"use client";

import { usePlayerStore, Track } from "@/store/playerStore";
import { Play } from "lucide-react";

export default function TrackCard({ track }: { track: Track }) {
  const { play } = usePlayerStore();

  const handlePlay = () => {
    play(track);
  };

  return (
    <div
      className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition cursor-pointer group shadow-lg"
      onClick={handlePlay}
    >
      <div className="w-full aspect-square bg-gray-900 rounded-md mb-4 flex items-center justify-center relative shadow-inner overflow-hidden">
        <span className="text-gray-600 font-bold text-2xl">MP3</span>
        <button
          onClick={(e) => { e.stopPropagation(); handlePlay(); }}
          className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
        >
          <Play className="w-6 h-6 ml-1 fill-black text-black" />
        </button>
      </div>
      <h3 className="text-white font-semibold truncate mb-1" title={track.title}>{track.title}</h3>
      <p className="text-gray-400 text-sm truncate" title={track.artist || "Unknown Artist"}>{track.artist || "Unknown Artist"}</p>
    </div>
  );
}
