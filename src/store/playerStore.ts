import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  fileUrl: string;
  duration: number | null;
};

type PlayerState = {
  currentTrackIndex: number;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;

  play: (track: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (vol: number) => void;
  setProgress: (prog: number) => void;
  setDuration: (dur: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrackIndex: -1,
  queue: [],
  isPlaying: false,
  volume: 0.5,
  progress: 0,
  duration: 0,

  play: (track, newQueue) =>
    set(() => {
      const queue = newQueue || [track];
      const index = queue.findIndex((t) => t.id === track.id);
      return {
        queue,
        currentTrackIndex: index !== -1 ? index : 0,
        isPlaying: true,
        progress: 0,
      };
    }),

  playQueue: (queue, startIndex = 0) =>
    set({
      queue,
      currentTrackIndex: startIndex,
      isPlaying: true,
      progress: 0,
    }),

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  next: () =>
    set((state) => {
      if (state.queue.length === 0 || state.currentTrackIndex === -1) return state;
      const nextIndex = state.currentTrackIndex + 1;
      if (nextIndex >= state.queue.length) return state; // End of queue
      return { currentTrackIndex: nextIndex, isPlaying: true, progress: 0 };
    }),

  prev: () =>
    set((state) => {
      if (state.queue.length === 0 || state.currentTrackIndex === -1) return state;
      const prevIndex = state.currentTrackIndex - 1;
      if (prevIndex < 0) return { progress: 0, isPlaying: true }; // Restart current track
      return { currentTrackIndex: prevIndex, isPlaying: true, progress: 0 };
    }),

  setVolume: (vol) => set({ volume: vol }),
  setProgress: (prog) => set({ progress: prog }),
  setDuration: (dur) => set({ duration: dur }),
}));
