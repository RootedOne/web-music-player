"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Track } from "@/store/playerStore";
import { ChevronLeft, Music } from "lucide-react";

type ArtistData = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracks: Track[];
};

export default function ArtistAlbumsPage() {
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

  if (isLoading) return <div className="p-8 text-white min-h-screen bg-black">Loading Albums...</div>;
  if (!artist) return <div className="p-8 text-white min-h-screen bg-black">Artist not found.</div>;

  // Deduping by album
  const uniqueAlbums = Array.from(new Set(artist.tracks.map(t => t.album).filter(Boolean)));
  const albumsList = uniqueAlbums.map(albumName => {
      return artist.tracks.find(t => t.album === albumName);
  }).filter(Boolean) as Track[];

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
        <h1 className="ml-4 text-xl font-bold tracking-tight text-white/90">{artist.name} - Albums</h1>
      </nav>

      {/* 2. Main Content Container (accounting for fixed nav) */}
      <div className="px-6 mx-auto max-w-7xl pt-24 space-y-8">
        {albumsList.length > 0 ? (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {albumsList.map((track) => (
                <Link key={track.id} href={`/album/${encodeURIComponent(track.album!)}`} className="flex flex-col group cursor-pointer block">
                  <div className="w-full aspect-square rounded-lg bg-neutral-800 overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all">
                    {track.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverUrl} alt={track.album || "Album"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-neutral-600" /></div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">
                    {track.album}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                    {track.createdAt ? new Date(track.createdAt).getFullYear() : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-gray-400 text-center py-12">No albums found.</div>
        )}
      </div>
    </div>
  );
}
