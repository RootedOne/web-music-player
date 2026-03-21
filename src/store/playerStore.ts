import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  fileUrl: string;
  coverUrl: string | null;
  duration: number | null;
};

type PlayerState = {
  currentTrackIndex: number;
  queue: Track[];
  originalQueue: Track[];
  isShuffle: boolean;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;

  play: (track: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  toggleShuffle: () => void;
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
  originalQueue: [],
  isShuffle: false,
  isPlaying: false,
  volume: 0.5,
  progress: 0,
  duration: 0,

  play: (track, newQueue) =>
    set((state) => {
      const queue = newQueue || [track];
      let currentQueue = queue;

      if(state.isShuffle) {
         currentQueue = [...queue].sort(() => Math.random() - 0.5);
         // Move the selected track to the front
         const selectedIdx = currentQueue.findIndex((t) => t.id === track.id);
         if(selectedIdx > -1) {
            const [selectedTrack] = currentQueue.splice(selectedIdx, 1);
            currentQueue.unshift(selectedTrack);
         }
      }

      const index = currentQueue.findIndex((t) => t.id === track.id);

      return {
        originalQueue: queue,
        queue: currentQueue,
        currentTrackIndex: index !== -1 ? index : 0,
        isPlaying: true,
        progress: 0,
      };
    }),

  playQueue: (queue, startIndex = 0) =>
    set((state) => {
      let currentQueue = queue;
      let currentIndex = startIndex;

      if(state.isShuffle) {
          currentQueue = [...queue].sort(() => Math.random() - 0.5);
          // Keep the chosen track first
          const selectedTrack = queue[startIndex];
          const newSelectedIdx = currentQueue.findIndex(t => t.id === selectedTrack.id);
          if(newSelectedIdx > -1) {
             const [track] = currentQueue.splice(newSelectedIdx, 1);
             currentQueue.unshift(track);
             currentIndex = 0;
          }
      }

      return {
        originalQueue: queue,
        queue: currentQueue,
        currentTrackIndex: currentIndex,
        isPlaying: true,
        progress: 0,
      };
    }),

  toggleShuffle: () => set((state) => {
      if(!state.isShuffle) {
          // Turn Shuffle On
          if(state.queue.length === 0) return { isShuffle: true };

          const currentTrack = state.queue[state.currentTrackIndex];
          const shuffledQueue = [...state.originalQueue].sort(() => Math.random() - 0.5);

          // Make sure current track remains playing
          const newIdx = shuffledQueue.findIndex(t => t.id === currentTrack.id);
          if(newIdx > -1) {
              const [track] = shuffledQueue.splice(newIdx, 1);
              shuffledQueue.unshift(track);
          }

          return {
              isShuffle: true,
              queue: shuffledQueue,
              currentTrackIndex: 0
          };
      } else {
          // Turn Shuffle Off
          const currentTrack = state.queue[state.currentTrackIndex];
          const originalIdx = state.originalQueue.findIndex(t => t.id === currentTrack?.id);

          return {
              isShuffle: false,
              queue: state.originalQueue,
              currentTrackIndex: originalIdx > -1 ? originalIdx : 0
          };
      }
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
