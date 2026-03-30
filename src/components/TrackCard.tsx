"use client";

import { usePlayerStore, Track } from "@/store/playerStore";
import { Play } from "lucide-react";
import TrackOptions from "./TrackOptions";

import React, { useState, Fragment } from "react";
import EditModal from "./EditModal";
import Link from "next/link";

const TrackCard = React.memo(function TrackCard({ track, onUpdate, onDelete }: { track: Track & { userId?: string }, onUpdate?: () => void, onDelete?: () => void }) {
  const { play } = usePlayerStore();
  const [isEditing, setIsEditing] = useState(false);

  const handlePlay = () => {
    play(track);
  };

  return (
    <div
      className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition cursor-pointer group shadow-lg"
      onClick={handlePlay}
    >
      <div className="w-full aspect-square bg-zinc-900/40 rounded-xl mb-4 flex items-center justify-center relative shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/20 font-bold text-2xl">MP3</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handlePlay(); }}
          className="absolute bottom-2 right-2 w-12 h-12 bg-[#fa243c] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          <Play className="w-6 h-6 ml-1 fill-white text-white" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <h3 className="text-white font-semibold truncate mb-1" title={track.title}>{track.title}</h3>
          <p className="text-gray-400 text-sm truncate">
            {track.artists && track.artists.length > 0 ? (
              track.artists.map((artist, idx) => (
                <Fragment key={artist.id}>
                  <Link href={`/artist/${encodeURIComponent(artist.id)}`} className="hover:underline hover:text-white" onClick={(e) => e.stopPropagation()}>
                    {artist.name}
                  </Link>
                  {idx < track.artists!.length - 1 ? ", " : ""}
                </Fragment>
              ))
            ) : (
               <Link href={`/artist/${encodeURIComponent(track.artist || "Unknown Artist")}`} className="hover:underline hover:text-white" onClick={(e) => e.stopPropagation()}>
                  {track.artist || "Unknown Artist"}
               </Link>
            )}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
           <TrackOptions
             trackId={track.id}
             trackOwnerId={track.userId || ""}
             fileUrl={track.fileUrl}
             trackTitle={track.title}
             onEdit={() => setIsEditing(true)}
             onDelete={onDelete}
           />
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
           initialSecondaryName={track.artist || ""}
           secondaryNameFieldLabel="Track Artist"
           secondaryNameFieldKey="artist"
           initialTertiaryName={track.album || ""}
           tertiaryNameFieldLabel="Track Album"
           tertiaryNameFieldKey="album"
         />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // ⚡ Bolt Performance Optimization:
  // Custom comparison for React.memo to ignore function reference changes (onUpdate, onDelete).
  // This prevents expensive unnecessary re-renders of the entire TrackCard grid
  // when the parent component re-renders but the underlying track data hasn't changed.
  // Expected Impact: Reduces DOM reconciliation by ~O(n) where n is list size on parent state updates.
  return prevProps.track.id === nextProps.track.id &&
         prevProps.track.title === nextProps.track.title &&
         prevProps.track.artist === nextProps.track.artist &&
         prevProps.track.coverUrl === nextProps.track.coverUrl;
});

export default TrackCard;
