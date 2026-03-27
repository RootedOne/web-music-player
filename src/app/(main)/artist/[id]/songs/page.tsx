"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Track } from "@/store/playerStore";
import TrackRow from "@/components/TrackRow";
import { ChevronLeft } from "lucide-react";

type ArtistData = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracks: Track[];
};

export default function ArtistSongsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artists/${id}`);
        if (res.ok) {
          setArtist(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchArtist();
  }, [id]);

  if (isLoading) return <div className="p-8 text-white min-h-screen bg-black">Loading Songs...</div>;
  if (!artist) return <div className="p-8 text-white min-h-screen bg-black">Artist not found.</div>;

  return (
    <div className="relative min-h-screen bg-black text-white pb-36 font-sans">
      {/* 1. Sticky Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 w-full flex items-center p-4 bg-black/50 backdrop-blur-md border-b border-white/10 transition-all">
        <button
           onClick={() => router.back()}
           className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 transition-colors text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-4 text-xl font-bold tracking-tight text-white/90">{artist.name} - Songs</h1>
      </nav>

      {/* 2. Main Content Container (accounting for fixed nav) */}
      <div className="px-6 mx-auto max-w-7xl pt-24 space-y-8">
        {artist.tracks.length > 0 ? (
          <section>
            <div className="flex flex-col gap-1">
              {artist.tracks.map((track, idx) => (
                <TrackRow
                   key={track.id}
                   track={track}
                   index={idx}
                   queue={artist.tracks}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-gray-400 text-center py-12">No songs found.</div>
        )}
      </div>
    </div>
  );
}
