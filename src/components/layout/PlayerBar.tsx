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
    <div className="h-20 md:h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 md:px-6 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] z-50 fixed bottom-0 left-0 w-full">
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

      {/* Track Info */}
      <div className="flex items-center gap-2 md:gap-4 w-[30%] md:w-1/3 min-w-0">
        <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-800 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
          <span className="text-gray-500 text-[10px] md:text-xs text-center p-1 font-bold">MP3</span>
        </div>
        <div className="truncate">
          <p className="text-white text-sm md:text-base font-medium truncate">{currentTrack.title || "Unknown Title"}</p>
          <p className="text-gray-400 text-xs md:text-sm truncate">{currentTrack.artist || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center w-[40%] md:w-1/3 max-w-lg">
        <div className="flex items-center gap-3 md:gap-6 mb-1 md:mb-2">
          <button onClick={toggleShuffle} className={`hidden sm:block transition ${isShuffle ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white'}`}>
             <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={prev} className="text-gray-400 hover:text-white transition">
            <SkipBack className="w-5 h-5 md:w-6 md:h-6 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 ml-1 fill-current" />
            )}
          </button>

          <button onClick={next} className="text-gray-400 hover:text-white transition">
            <SkipForward className="w-5 h-5 md:w-6 md:h-6 fill-current" />
          </button>

          <button onClick={toggleShuffle} className={`sm:hidden transition ${isShuffle ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white'}`}>
             <Shuffle className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center gap-2 md:gap-3">
          <span className="text-[10px] md:text-xs text-gray-400 w-8 md:w-10 text-right">{formatTime(progress)}</span>
          <div className="relative w-full flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${(progress / (duration || 1)) * 100}%, #374151 ${(progress / (duration || 1)) * 100}%)`
              }}
            />
          </div>
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & Extras */}
      <div className="flex items-center justify-end w-[30%] md:w-1/3 gap-2 md:gap-3 pr-2">
        <button onClick={toggleMute} className="text-gray-400 hover:text-white transition hidden sm:block">
          {volume === 0 ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        <div className="relative w-16 md:w-24 flex items-center group hidden sm:flex">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer focus:outline-none"
            style={{
                background: `linear-gradient(to right, #3b82f6 ${volume * 100}%, #374151 ${volume * 100}%)`
            }}
          />
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
    </div>
  );
}
