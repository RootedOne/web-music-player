import { create } from 'zustand';

type OfflineState = {
  isOffline: boolean;
  cachedUrls: string[];
  setOfflineStatus: (status: boolean) => void;
  setCachedUrls: (urls: string[]) => void;
};

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  cachedUrls: [],
  setOfflineStatus: (status) => set({ isOffline: status }),
  setCachedUrls: (urls) => set({ cachedUrls: urls }),
}));
