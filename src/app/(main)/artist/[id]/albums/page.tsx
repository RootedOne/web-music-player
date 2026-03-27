"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Music } from "lucide-react";

type AlbumData = {
  albumName: string;
  releaseYear: string;
  coverUrl: string | null;
};

export default function ArtistAlbumsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artists/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAlbums(data.albums || []);
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

  return (
    <div className="relative min-h-screen bg-black text-white pb-36 font-sans">
      <nav className="sticky top-0 z-50 w-full flex items-center gap-4 px-4 py-4 md:py-6 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all pt-safe">
        <button
           onClick={() => router.back()}
           className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white backdrop-blur-md shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Albums</h1>
      </nav>

      <div className="px-6 mx-auto max-w-7xl mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {albums.map((album, idx) => (
            <Link key={idx} href={`/artist/${id}/album/${encodeURIComponent(album.albumName)}`} className="flex flex-col group cursor-pointer w-full">
              <div className="w-full aspect-square rounded-lg bg-neutral-800 overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all">
                {album.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.coverUrl} alt={album.albumName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-neutral-600" /></div>
                )}
              </div>
              <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">
                {album.albumName}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                {album.releaseYear}
              </p>
            </Link>
          ))}
        </div>
        {albums.length === 0 && (
          <p className="text-gray-400 mt-8 text-center">No albums found.</p>
        )}
      </div>
    </div>
  );
}
