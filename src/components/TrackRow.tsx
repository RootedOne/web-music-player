"use client";

import { Track, usePlayerStore } from "@/store/playerStore";
import { Play, Pause, Music } from "lucide-react";
import TrackOptions from "./TrackOptions";
import Link from "next/link";
import { Fragment } from "react";

interface TrackRowProps {
  track: Track;
  index: number;
  queue: Track[];
}

export default function TrackRow({ track, index, queue }: TrackRowProps) {
  const { playQueue, queue: globalQueue, currentTrackIndex, isPlaying, pause, resume } = usePlayerStore();
  const currentTrack = globalQueue[currentTrackIndex];
  const isThisTrackPlaying = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isThisTrackPlaying) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      playQueue(queue, index);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      onDoubleClick={handlePlay}
      className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition group border-b border-white/5 last:border-0 rounded-lg cursor-pointer"
    >
      <div className="w-8 text-center text-gray-500 text-sm group-hover:hidden">
        {isThisTrackPlaying && isPlaying ? (
            <div className="flex gap-1 items-end justify-center h-4 w-4 mx-auto">
              <div className="w-1 bg-blue-500 animate-[bounce_1s_infinite_0ms]" />
              <div className="w-1 bg-blue-500 animate-[bounce_1s_infinite_200ms]" />
              <div className="w-1 bg-blue-500 animate-[bounce_1s_infinite_400ms]" />
            </div>
        ) : (
            index + 1
        )}
      </div>

      <button
        onClick={handlePlay}
        className="w-8 hidden group-hover:flex items-center justify-center text-white"
      >
        {isThisTrackPlaying && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
      </button>

      <div className="w-10 h-10 rounded bg-[#282828] flex-shrink-0 overflow-hidden shadow-md flex items-center justify-center relative">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5 text-gray-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold truncate ${isThisTrackPlaying ? "text-blue-500" : "text-white"}`}>
          {track.title}
        </h3>
        <p className="text-sm text-gray-400 truncate">
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
               <Link href={`/artist/${encodeURIComponent(track.artistObj?.id || track.artist || "Unknown Artist")}`} className="hover:underline hover:text-white" onClick={(e) => e.stopPropagation()}>
                  {track.artistObj?.name || track.artist || "Unknown Artist"}
               </Link>
            )}
        </p>
      </div>

      <div className="hidden md:block flex-1 min-w-0 text-sm text-gray-400 truncate">
        {track.album || "Unknown Album"}
      </div>

      <div className="text-sm text-gray-400 w-12 text-right tabular-nums">
        {formatDuration(track.duration)}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <TrackOptions
          trackId={track.id}
          trackOwnerId={track.userId || ""}
          fileUrl={track.fileUrl}
          trackTitle={track.title}
        />
      </div>
    </div>
  );
}
