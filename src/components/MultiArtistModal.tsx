"use client";

import { Dialog } from "@headlessui/react";
import { Music, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MultiArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artists: string[];
  closePlayer?: () => void;
}

export default function MultiArtistModal({ isOpen, onClose, artists, closePlayer }: MultiArtistModalProps) {
  const router = useRouter();
  const [loadingArtist, setLoadingArtist] = useState<string | null>(null);

  const handleArtistClick = async (artistName: string) => {
    setLoadingArtist(artistName);

    // Attempt to resolve the artist ID from our database by name
    try {
      const res = await fetch(`/api/artists?q=${encodeURIComponent(artistName)}`);
      if (res.ok) {
        const foundArtists = await res.json();
        // Exact case-insensitive match
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exactMatch = foundArtists.find((a: any) => a.name.toLowerCase() === artistName.toLowerCase());

        onClose(); // Close modal immediately before navigation
        if (closePlayer) {
            closePlayer();
        }

        setTimeout(() => {
            if (exactMatch) {
                router.push(`/artist/${exactMatch.id}`);
            } else {
                // Fallback to global search
                router.push(`/?q=${encodeURIComponent(artistName)}`);
            }
        }, 300);
      }
    } catch (err) {
      console.error(err);
      onClose();
      if (closePlayer) {
          closePlayer();
      }
      setTimeout(() => {
        router.push(`/?q=${encodeURIComponent(artistName)}`);
      }, 300);
    } finally {
      setLoadingArtist(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[110]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />

      {/* Modal / Bottom Sheet Panel */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <Dialog.Panel className="w-full max-w-sm bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all pb-6 sm:pb-0">

          {/* Mobile Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>

          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <Dialog.Title className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-2">
              Go to Artist
            </Dialog.Title>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
               <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {artists.map((artistName, idx) => (
              <button
                key={idx}
                onClick={() => handleArtistClick(artistName)}
                disabled={loadingArtist === artistName}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-colors group text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
                     {loadingArtist === artistName ? (
                         <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     ) : (
                         <Music className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                     )}
                  </div>
                  <span className="text-white font-medium truncate text-lg">{artistName}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
