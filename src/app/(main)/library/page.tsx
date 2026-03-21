"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/store/playerStore";

export default function LibraryPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyTracks();
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
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/tracks", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      router.refresh();
      // Wait a tiny bit and refresh personal list
      setTimeout(() => { fetchMyTracks(); }, 500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during upload");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          Your Library
        </h1>
        <p className="text-gray-400 mt-2">Manage your uploaded tracks and playlists</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Upload Music</h2>

        {error && <div className="mb-4 text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors
            ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-500 bg-gray-800/50"}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-blue-400">
              <Loader2 className="w-12 h-12 mb-4 animate-spin" />
              <p className="font-semibold">Uploading & parsing metadata...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-300 font-semibold mb-2">Drag and drop your audio files here</p>
              <p className="text-gray-500 text-sm mb-6">Supports .mp3 and .wav</p>

              <label className="bg-white text-black px-8 py-3 rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  accept=".mp3,audio/mpeg,.wav,audio/wav,audio/x-wav"
                  onChange={handleFileChange}
                />
              </label>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Your Uploads</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading your music...</p>
        ) : myTracks.length === 0 ? (
          <p className="text-gray-500 bg-gray-800/50 p-6 rounded-lg text-center border border-gray-700 border-dashed">
            You haven&apos;t uploaded any tracks yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {myTracks.map((track) => (
               <TrackCard key={track.id} track={track} onUpdate={fetchMyTracks} onDelete={fetchMyTracks} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
