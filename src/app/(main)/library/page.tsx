"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Upload, Loader2, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/store/playerStore";
import { VirtuosoGrid } from "react-virtuoso";
import React from "react";
import * as mm from "music-metadata-browser";

type Playlist = { id: string; name: string, coverUrl: string | null };

export default function LibraryPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");

  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialTracks();
    fetchMyPlaylists();
  }, []);

  const fetchInitialTracks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tracks?filter=personal&limit=50");
      if (res.ok) {
        const data = await res.json();
        setMyTracks(data.tracks);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreTracks = async () => {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/tracks?filter=personal&limit=50&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setMyTracks((prev) => [...prev, ...data.tracks]);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingMore(false);
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
        setUploadProgress(`Processing ${i + 1} of ${files.length}: ${file.name}...`);

        try {
          // 1. Extract Metadata
          let title = file.name.replace(/\.[^/.]+$/, "");
          let artist = "Unknown Artist";
          let album = "Unknown Album";
          let duration = 0;
          let coverBlob: Blob | null = null;
          let coverMimeType = "image/jpeg";

          try {
            const metadata = await mm.parseBlob(file);
            if (metadata.common.title) title = metadata.common.title;
            if (metadata.common.artist) artist = metadata.common.artist;
            if (metadata.common.album) album = metadata.common.album;
            if (metadata.format.duration) duration = metadata.format.duration;

            if (metadata.common.picture && metadata.common.picture.length > 0) {
              const picture = metadata.common.picture[0];
              // Convert the Buffer to an ArrayBuffer to safely create the Blob
              coverBlob = new Blob([new Uint8Array(picture.data).buffer], { type: picture.format });
              coverMimeType = picture.format;
            }
          } catch (metaErr) {
            console.warn(`Could not parse ID3 tags for ${file.name}:`, metaErr);
          }

          // 2. Pre-flight check for duplicates
          const dupRes = await fetch("/api/tracks/check-duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, artist }),
          });
          const dupData = await dupRes.json();
          if (!dupRes.ok) throw new Error(dupData.error || "Failed to check duplicate");
          if (dupData.isDuplicate) {
            throw new Error(`Track "${title}" by "${artist}" already exists.`);
          }

          setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}...`);

          // 3. Request Presigned URLs
          const filesToUpload = [{ name: file.name, type: file.type }];
          if (coverBlob) {
            filesToUpload.push({ name: `cover-${file.name}.jpg`, type: coverMimeType });
          }

          const presignRes = await fetch("/api/upload/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesToUpload }),
          });

          if (!presignRes.ok) {
             const data = await presignRes.json();
             throw new Error(data.error || "Failed to get upload URLs");
          }

          const { urls } = await presignRes.json();
          const trackUploadInfo = urls[0];
          const coverUploadInfo = urls.length > 1 ? urls[1] : null;

          // 4. Upload Files to S3 directly
          const trackUploadRes = await fetch(trackUploadInfo.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!trackUploadRes.ok) {
            const errText = await trackUploadRes.text();
            console.error("Track S3 Upload Error:", trackUploadRes.status, errText);
            throw new Error(`Failed to upload ${file.name} to cloud. Status: ${trackUploadRes.status}. Error: ${errText}`);
          }

          let coverUrl = null;
          if (coverBlob && coverUploadInfo) {
             const coverUploadRes = await fetch(coverUploadInfo.presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": coverMimeType },
                body: coverBlob,
             });
             if (coverUploadRes.ok) {
               coverUrl = coverUploadInfo.publicUrl;
             } else {
               const errText = await coverUploadRes.text();
               console.error("Cover S3 Upload Error:", coverUploadRes.status, errText);
               throw new Error(`Failed to upload cover art for ${file.name} to cloud. Status: ${coverUploadRes.status}. Error: ${errText}`);
             }
          }

          // 5. Save Record to Database
          const saveRes = await fetch("/api/tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              artist,
              album,
              duration,
              fileUrl: trackUploadInfo.publicUrl,
              coverUrl,
            }),
          });

          if (!saveRes.ok) {
            const data = await saveRes.json();
            throw new Error(data.error || `Failed to save track ${file.name}`);
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
    setTimeout(() => { fetchInitialTracks(); }, 500);
    setIsUploading(false);
    setUploadProgress("");
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
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Playlists</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading playlists...</p>
        ) : myPlaylists.length === 0 ? (
          <p className="text-gray-500 bg-[#181818] p-6 rounded-lg text-center border border-[#282828] border-dashed">
            You haven&apos;t created or saved any playlists yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {myPlaylists.map((pl) => (
              <Link key={pl.id} href={`/playlists/${pl.id}`} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)] group">
                <div className="w-full aspect-square bg-[#282828] rounded-md mb-4 flex items-center justify-center overflow-hidden shadow-inner relative">
                  {pl.coverUrl ? (
                     <img src={pl.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                     <Music className="w-12 h-12 text-gray-600" />
                  )}
                </div>
                <h3 className="text-white font-semibold truncate">{pl.name}</h3>
                <p className="text-gray-400 text-sm truncate">Playlist</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Upload Music</h2>

        {error && <div className="mb-4 text-red-400 bg-red-900/20 p-3 rounded font-medium border border-red-900/50">{error}</div>}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors text-center
            ${isDragging ? "border-[#fa243c] bg-[#fa243c]/10" : "border-gray-700 hover:border-gray-500 bg-gray-800/50"}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-[#fa243c]">
              <Loader2 className="w-12 h-12 mb-4 animate-spin" />
              <p className="font-semibold">{uploadProgress || "Uploading & parsing metadata..."}</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-300 font-semibold mb-2">Drag and drop your audio files here</p>
              <p className="text-gray-500 text-sm mb-6">Supports multiple .mp3 and .wav files</p>

              <label className="bg-white text-black px-8 py-3 rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">
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

      <section>
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Your Uploads</h2>
        {isLoading && myTracks.length === 0 ? (
          <p className="text-gray-500">Loading your music...</p>
        ) : myTracks.length === 0 ? (
          <p className="text-gray-500 bg-gray-800/50 p-6 rounded-lg text-center border border-gray-700 border-dashed">
            You haven&apos;t uploaded any tracks yet.
          </p>
        ) : (
          <VirtuosoGrid
            useWindowScroll={false}
            customScrollParent={typeof window !== 'undefined' ? document.querySelector('main') || undefined : undefined}
            totalCount={myTracks.length}
            overscan={200}
            data={myTracks}
            components={{
              List: React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(function VirtuosoList({ style, children, ...props }, ref) {
                return (
                  <div
                    ref={ref}
                    {...props}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                    style={{ ...style }}
                  >
                    {children}
                  </div>
                );
              }),
              Item: React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(function VirtuosoItem({ children, ...props }, ref) {
                return <div ref={ref} {...props}>{children}</div>;
              })
            }}
            itemContent={(index, track) => (
               <TrackCard key={track.id} track={track} onUpdate={fetchInitialTracks} onDelete={fetchInitialTracks} />
            )}
            endReached={loadMoreTracks}
          />
        )}
        {isFetchingMore && (
           <div className="flex justify-center mt-6">
              <div className="w-6 h-6 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
      </section>
    </>
  );
}
