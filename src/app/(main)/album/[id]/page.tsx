"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Track, usePlayerStore } from "@/store/playerStore";
import TrackRow from "@/components/TrackRow";
import { Play, Music, ChevronLeft } from "lucide-react";

type AlbumData = {
  id: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  tracks: Track[];
};

export default function AlbumProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playQueue } = usePlayerStore();

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/albums/${id}`);
        if (res.ok) {
          setAlbum(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchAlbum();
  }, [id]);

  if (isLoading) return <div className="p-8 text-white min-h-screen bg-black">Loading Album...</div>;
  if (!album) return <div className="p-8 text-white min-h-screen bg-black">Album not found.</div>;

  const handlePlayAll = () => {
    if (album.tracks.length > 0) {
      playQueue(album.tracks, 0);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white pb-40 font-sans">
      <nav className="sticky top-0 z-50 w-full flex items-center p-4 bg-black/40 backdrop-blur-xl border-b border-white/5 transition-all">
        <button
           onClick={() => router.back()}
           className="w-12 h-12 flex items-center justify-center rounded-full bg-black/50 active:bg-black/80 transition-colors text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </nav>

      <div className="relative w-full h-[50vh] sm:h-[60vh] max-h-[600px] overflow-hidden -mt-[73px]">
        {album.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${album.imageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
            <Music className="w-32 h-32 text-neutral-700" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute bottom-0 w-full px-6 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-white drop-shadow-xl leading-none mb-2">
              {album.name}
            </h1>
            <p className="text-xl sm:text-2xl text-neutral-300 font-medium tracking-tight drop-shadow-md">{album.artist}</p>
          </div>
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#fa243c] active:bg-[#d41b2f] active:scale-95 transition-all flex items-center justify-center shadow-[0_8px_32px_rgba(250,36,60,0.5)] shrink-0 group"
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="px-6 mx-auto max-w-7xl mt-6 space-y-12">
        {album.tracks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white/90 tracking-tight mb-4">Songs</h2>
            <div className="flex flex-col gap-1">
              {album.tracks.map((track, idx) => (
                <TrackRow
                   key={track.id}
                   track={track}
                   index={idx}
                   queue={album.tracks}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
