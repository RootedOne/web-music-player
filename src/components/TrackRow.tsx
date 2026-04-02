"use client";

import { Track, usePlayerStore } from "@/store/playerStore";
import { Music } from "lucide-react";
import TrackOptions from "./TrackOptions";
import Link from "next/link";
import { Fragment, useMemo } from "react";
import { useOfflineStore } from "@/store/offlineStore";

interface TrackRowProps {
  track: Track;
  index: number;
  queue: Track[];
}

export default function TrackRow({ track, index, queue }: TrackRowProps) {
  const { playQueue, queue: globalQueue, currentTrackIndex, isPlaying, pause, resume } = usePlayerStore();
  const currentTrack = globalQueue[currentTrackIndex];
  const isThisTrackPlaying = currentTrack?.id === track.id;
  const { isOffline, cachedUrls } = useOfflineStore();

  const isCached = useMemo(() => {
    if (!isOffline) return true;
    return cachedUrls.some(url => track.fileUrl.includes(url));
  }, [isOffline, cachedUrls, track.fileUrl]);

  const handlePlay = (e?: React.MouseEvent) => {
    if (isOffline && !isCached) return;

    // Optional click event from row
    if (e) {
      // Don't play if clicking on links or options
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button')) {
        return;
      }
    }

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

  return (
    <div
      onClick={handlePlay}
      className={`flex items-center w-full gap-3 p-2 h-16 rounded-xl transition-colors group ${
        isOffline && !isCached ? 'opacity-40 grayscale cursor-not-allowed' : 'active:bg-white/10 cursor-pointer'
      }`}
    >
      <div className="w-12 h-12 flex-shrink-0 rounded-md bg-[#282828] overflow-hidden flex items-center justify-center relative shadow-sm">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-6 h-6 text-gray-500" />
        )}

        {/* Playing Indicator Overlay */}
        {isThisTrackPlaying && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
              <div className="w-1 h-3 bg-[#fa243c] animate-[bounce_1s_infinite_0ms]" />
              <div className="w-1 h-3 bg-[#fa243c] animate-[bounce_1s_infinite_200ms]" />
              <div className="w-1 h-3 bg-[#fa243c] animate-[bounce_1s_infinite_400ms]" />
            </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className={`truncate font-medium text-base ${isThisTrackPlaying ? "text-[#fa243c]" : "text-white"}`}>
          {track.title}
        </h3>
        <p className="truncate text-neutral-400 text-sm mt-0.5">
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

      <div
        className="flex-shrink-0 ms-auto w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
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
