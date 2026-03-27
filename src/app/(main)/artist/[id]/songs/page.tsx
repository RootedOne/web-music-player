"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Track } from "@/store/playerStore";
import TrackRow from "@/components/TrackRow";
import { ChevronLeft } from "lucide-react";

export default function ArtistSongsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artists/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTracks(data.tracks || []);
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

  return (
    <div className="relative min-h-screen bg-black text-white pb-36 font-sans">
      <nav className="sticky top-0 z-50 w-full flex items-center gap-4 px-4 py-4 md:py-6 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all pt-safe">
        <button
           onClick={() => router.back()}
           className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white backdrop-blur-md shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">All Songs</h1>
      </nav>

      <div className="px-6 mx-auto max-w-7xl mt-6">
        <div className="flex flex-col gap-1">
          {tracks.map((track, idx) => (
            <TrackRow
               key={track.id}
               track={track}
               index={idx}
               queue={tracks}
            />
          ))}
        </div>
        {tracks.length === 0 && (
          <p className="text-gray-400 mt-8 text-center">No songs found.</p>
        )}
      </div>
    </div>
  );
}
