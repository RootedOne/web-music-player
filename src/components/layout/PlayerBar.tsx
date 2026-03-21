"use client";

import { useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

export function PlayerBar() {
  const {
    currentTrackIndex,
    queue,
    isShuffle,
    isPlaying,
    volume,
    progress,
    duration,
    pause,
    resume,
    next,
    prev,
    setVolume,
    setProgress,
    setDuration,
    toggleShuffle,
    playQueue,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => console.error("Playback failed:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex, currentTrack]); // Added currentTrack to re-trigger play on track change

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    next();
  };

  const handleGlobalShufflePlay = async () => {
    // Context-Aware Global Shuffle
    // If the queue only has 1 track (a single song played from Library/Discover)
    // or is completely empty, act as a "Global Radio" and pull random tracks.
    if (queue.length <= 1) {
      try {
        const res = await fetch("/api/tracks/random?limit=50");
        if (res.ok) {
          const data = await res.json();
          if (data.tracks && data.tracks.length > 0) {
            // If a single track is currently playing, preserve it as the first track
            // and append the random radio queue behind it.
            let newQueue = data.tracks;
            const startIndex = 0;

            if (queue.length === 1 && currentTrack) {
               // Remove the current track from the randomized pool to avoid immediate duplicates
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               newQueue = newQueue.filter((t: any) => t.id !== currentTrack.id);
               newQueue.unshift(currentTrack);
            }

            playQueue(newQueue, startIndex);

            if (!isShuffle) {
              toggleShuffle();
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch global random tracks", err);
      }
    } else {
      // The user is in an active Playlist or Album queue (length > 1)
      // Only shuffle the existing active context.
      toggleShuffle();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const togglePlayPause = () => {
    if (isPlaying) pause();
    else resume();
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.5 : 0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (!currentTrack) return null; // Don't render until a track is selected (optional, or render empty state)

  return (
    <>
      {/* Hidden Audio Element */}
      {currentTrack && (
         <audio
          ref={audioRef}
          src={currentTrack.fileUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      {/* --- Mobile View (Apple Music Style Floating Pill) --- */}
      <div className="md:hidden fixed bottom-[88px] inset-x-0 z-[60] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md h-[60px] bg-neutral-900/90 backdrop-blur-xl saturate-[180%] rounded-full shadow-2xl border border-white/10 flex items-center justify-between px-2 relative overflow-hidden pointer-events-auto transition-transform duration-300">

          {/* Subtle Background Progress Bar */}
          <div
            className="absolute bottom-0 left-0 h-[3px] bg-white/20 pointer-events-none"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />

          {/* Left: Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 z-10 pl-1">
            <div className="w-11 h-11 bg-[#181818] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-sm border border-white/5">
              {currentTrack.coverUrl ? (
                 <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                 <span className="text-gray-500 text-[10px] text-center font-bold">MP3</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 pr-2">
              <p className="text-white text-sm font-bold truncate leading-tight tracking-wide">{currentTrack.title || "Unknown Title"}</p>
              <p className="text-[#a0a0a0] text-xs font-medium truncate leading-tight mt-0.5">{currentTrack.artist || "Unknown Artist"}</p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1 shrink-0 z-10 mr-1">
             <button onClick={togglePlayPause} className="text-white p-2 rounded-full hover:bg-white/10 focus:outline-none active:scale-95 transition-all">
               {isPlaying ? (
                 <Pause className="w-6 h-6 fill-current" />
               ) : (
                 <Play className="w-6 h-6 fill-current ml-0.5" />
               )}
             </button>
             <button onClick={next} className="text-white p-2 rounded-full hover:bg-white/10 focus:outline-none active:scale-95 transition-all">
               <SkipForward className="w-6 h-6 fill-current" />
             </button>
          </div>
        </div>
      </div>

      {/* --- Desktop View --- */}
      <div className="hidden md:flex bg-black border-t border-[#282828] shadow-[0_-4px_10px_rgba(0,0,0,0.5)] z-50 fixed bottom-0 left-0 w-full h-24 items-center justify-between px-6">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-0">
          <div className="w-14 h-14 bg-gray-800 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-md">
            {currentTrack.coverUrl ? (
               <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
               <span className="text-gray-500 text-xs text-center p-1 font-bold">MP3</span>
            )}
          </div>
          <div className="truncate pr-4">
            <p className="text-white text-base font-medium truncate">{currentTrack.title || "Unknown Title"}</p>
            <p className="text-gray-400 text-sm truncate">{currentTrack.artist || "Unknown Artist"}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center w-1/3 max-w-lg">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={handleGlobalShufflePlay} className={`transition relative ${isShuffle ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
               <Shuffle className="w-5 h-5" />
               {isShuffle && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>}
            </button>
            <button onClick={prev} className="text-gray-400 hover:text-white transition">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 ml-1 fill-current" />
              )}
            </button>

            <button onClick={next} className="text-gray-400 hover:text-white transition">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 text-right">{formatTime(progress)}</span>
            <div className="relative w-full flex items-center group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="w-full h-1 bg-[#4d4d4d] rounded-full appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #ffffff ${(progress / (duration || 1)) * 100}%, #4d4d4d ${(progress / (duration || 1)) * 100}%)`
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="flex items-center justify-end w-1/3 gap-3 pr-2">
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition">
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="relative w-24 flex items-center group">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-[#4d4d4d] rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                  background: `linear-gradient(to right, #ffffff ${volume * 100}%, #4d4d4d ${volume * 100}%)`
              }}
            />
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .group:hover input[type=range]::-webkit-slider-thumb {
          opacity: 1;
        }
      `}} />
    </>
  );
}
