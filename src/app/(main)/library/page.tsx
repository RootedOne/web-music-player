"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Upload, Loader2, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/store/playerStore";

type Playlist = { id: string; name: string, coverUrl: string | null };

export default function LibraryPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyTracks();
    fetchMyPlaylists();
  }, []);

  const fetchMyTracks = async () => {
    try {
      const res = await fetch("/api/tracks?filter=personal");
      if (res.ok) {
        const data = await res.json();
        setMyTracks(data.tracks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        setMyPlaylists(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    setError("");
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = "";

    const CONCURRENCY_LIMIT = 3;
    let currentIndex = 0;

    const uploadWorker = async () => {
      while (currentIndex < files.length) {
        const i = currentIndex++;
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}...`);

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/tracks", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || `Upload failed for ${file.name}`);
          }
          successCount++;
        } catch (err: unknown) {
          failCount++;
          if (err instanceof Error) {
            lastError = err.message;
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, files.length) }, uploadWorker);
    await Promise.all(workers);

    if (failCount > 0) {
      setError(`Failed to upload ${failCount} file(s). Last error: ${lastError}`);
    } else if (successCount > 0) {
      setUploadProgress("");
    }

    router.refresh();
    setTimeout(() => { fetchMyTracks(); }, 500);
    setIsUploading(false);
    setUploadProgress("");
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          Your Library
        </h1>
        <p className="text-neutral-400 mt-2">Manage your uploaded tracks and playlists</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-white">Playlists</h2>
        {isLoading ? (
          <p className="text-neutral-500">Loading playlists...</p>
        ) : myPlaylists.length === 0 ? (
          <p className="text-neutral-500 bg-white/5 p-6 rounded-3xl text-center border border-white/10 border-dashed">
            You haven&apos;t created or saved any playlists yet.
          </p>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 hide-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 md:overflow-visible">
            {myPlaylists.map((pl) => (
              <Link key={pl.id} href={`/playlists/${pl.id}`} className="snap-start shrink-0 w-40 md:w-auto bg-white/5 p-4 rounded-3xl active:scale-95 transition cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)] group border border-white/10">
                <div className="w-full aspect-square bg-neutral-800 rounded-2xl mb-4 flex items-center justify-center overflow-hidden shadow-inner relative">
                  {pl.coverUrl ? (
                     <img src={pl.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                     <Music className="w-12 h-12 text-neutral-600" />
                  )}
                </div>
                <h3 className="text-white font-semibold truncate">{pl.name}</h3>
                <p className="text-neutral-400 text-sm truncate">Playlist</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-white">Upload Music</h2>

        {error && <div className="mb-4 text-[#fa243c] bg-[#fa243c]/10 p-3 rounded-2xl font-medium border border-[#fa243c]/20">{error}</div>}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-colors text-center
            ${isDragging ? "border-white bg-white/10" : "border-white/20 active:bg-white/5 bg-white/5"}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-white">
              <Loader2 className="w-12 h-12 mb-4 animate-spin" />
              <p className="font-semibold">{uploadProgress || "Uploading & parsing metadata..."}</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-neutral-400 mb-4" />
              <p className="text-neutral-300 font-semibold mb-2">Drag and drop your audio files here</p>
              <p className="text-neutral-500 text-sm mb-6">Supports multiple .mp3 and .wav files</p>

              <label className="bg-white text-black px-8 py-3 min-h-[44px] flex items-center justify-center rounded-full font-bold cursor-pointer active:scale-95 active:bg-gray-200 transition-transform">
                Browse Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".mp3,audio/mpeg,.wav,audio/wav,audio/x-wav"
                  onChange={handleFileChange}
                />
              </label>
            </>
          )}
        </div>
      </section>

      <section className="pb-40 md:pb-0">
        <h2 className="text-2xl font-bold mb-6 text-white">Your Uploads</h2>
        {isLoading ? (
          <p className="text-neutral-500">Loading your music...</p>
        ) : myTracks.length === 0 ? (
          <p className="text-neutral-500 bg-white/5 p-6 rounded-3xl text-center border border-white/10 border-dashed">
            You haven&apos;t uploaded any tracks yet.
          </p>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 hide-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 md:overflow-visible">
            {myTracks.map((track) => (
               <div key={track.id} className="snap-start shrink-0 w-40 md:w-auto">
                 <TrackCard track={track} onUpdate={fetchMyTracks} onDelete={fetchMyTracks} />
               </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
