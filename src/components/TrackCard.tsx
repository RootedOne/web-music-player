"use client";

import { usePlayerStore, Track } from "@/store/playerStore";
import { Play } from "lucide-react";
import TrackOptions from "./TrackOptions";

import { useState } from "react";
import EditModal from "./EditModal";

export default function TrackCard({ track, onUpdate }: { track: Track & { userId?: string }, onUpdate?: () => void }) {
  const { play } = usePlayerStore();
  const [isEditing, setIsEditing] = useState(false);

  const handlePlay = () => {
    play(track);
  };

  return (
    <div
      className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition cursor-pointer group shadow-lg"
      onClick={handlePlay}
    >
      <div className="w-full aspect-square bg-[#181818] rounded-md mb-4 flex items-center justify-center relative shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-600 font-bold text-2xl">MP3</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handlePlay(); }}
          className="absolute bottom-2 right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
        >
          <Play className="w-6 h-6 ml-1 fill-black text-black" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <h3 className="text-white font-semibold truncate mb-1" title={track.title}>{track.title}</h3>
          <p className="text-gray-400 text-sm truncate" title={track.artist || "Unknown Artist"}>{track.artist || "Unknown Artist"}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
           <TrackOptions trackId={track.id} trackOwnerId={track.userId || ""} onEdit={() => setIsEditing(true)} />
        </div>
      </div>

      {isEditing && (
         <EditModal
           isOpen={isEditing}
           onClose={() => setIsEditing(false)}
           onSuccess={() => { if(onUpdate) onUpdate(); else window.location.reload(); }}
           title="Edit Track"
           endpoint={`/api/tracks/${track.id}`}
           initialName={track.title}
           nameFieldLabel="Track Title"
           nameFieldKey="title"
         />
      )}
    </div>
  );
}
