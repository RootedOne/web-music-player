"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, Music, User, Disc3, Loader2, MoreVertical, Trash2, Pencil, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { completeMusicRequest, deleteMusicRequest, updateMusicRequest } from '@/actions/musicRequests';
import { WarningModal } from './WarningModal';
import * as musicMetadata from 'music-metadata-browser';
import { v4 as uuidv4 } from 'uuid';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

type RequestCardProps = {
  request: {
    id: string;
    requesterName: string;
    requesterId?: string;
    targetMusicName: string;
    targetArtist: string;
    targetAlbum?: string;
    status: 'pending' | 'completed';
  };
  currentUserId?: string;
  onUpdate?: () => void;
};

export const RequestCard = ({ request: initialRequest, currentUserId, onUpdate }: RequestCardProps) => {
  const [request, setRequest] = useState(initialRequest);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editSongName, setEditSongName] = useState(request.targetMusicName);
  const [editArtist, setEditArtist] = useState(request.targetArtist);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ff = new FFmpeg();
        await ff.load();
        setFfmpeg(ff);
        setIsFfmpegLoaded(true);
      } catch (err) {
        console.error('Failed to load FFmpeg:', err);
      }
    };
    loadFFmpeg();
  }, []);
  const [simulatedUpload, setSimulatedUpload] = useState<{ title: string; artist: string; file: File; coverBlob: Blob | null, coverExt: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    setUploadProgress("Extracting metadata...");

    // Parse ID3 Client-side
    let title = file.name.replace(/\.[^/.]+$/, "");
    let artist = "Unknown Artist";
    let coverBlob: Blob | null = null;
    let coverExt = "jpg";

    try {
      const metadata = await musicMetadata.parseBlob(file);
      if (metadata.common.title) title = metadata.common.title;
      if (metadata.common.artist) artist = metadata.common.artist;

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        coverBlob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
        if (picture.format === 'image/png') coverExt = 'png';
      }
    } catch (metaErr) {
      console.warn("Could not parse ID3 tags on client:", metaErr);
    }

    let uploadFile: Blob | File = file;
    let ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';

    if (isFfmpegLoaded && ffmpeg) {
      setUploadProgress("Compressing audio... this may take a moment.");
      try {
        const inputName = `input.${ext}`;
        const outputName = `output.mp3`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));
        await ffmpeg.exec(['-i', inputName, '-codec:a', 'libmp3lame', '-b:a', '128k', outputName]);

        const data = await ffmpeg.readFile(outputName);
        uploadFile = new Blob([new Uint8Array(data as Iterable<number>)], { type: 'audio/mpeg' });
        ext = 'mp3';

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (ffmpegErr) {
        console.warn("Failed to compress file on client, falling back to original file:", ffmpegErr);
      }
    }

    setUploadProgress("");
    setSelectedFile(uploadFile);
    setSimulatedUpload({ title, artist, file: uploadFile as File, coverBlob, coverExt });
    setIsModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const directUploadToS3 = async (file: File | Blob, key: string) => {
    const presignedRes = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });

    if (!presignedRes.ok) {
      throw new Error(`Failed to get presigned URL for ${key}`);
    }

    const { presignedUrl, publicUrl } = await presignedRes.json();

    try {
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload file to S3: ${uploadRes.statusText}`);
      }
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         throw new Error('Network Error: CORS rejection or connection failure. Please check the S3 bucket CORS rules.');
      }
      throw err;
    }

    return publicUrl;
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !simulatedUpload) return;

    setIsUpdating(true);

    try {
      // 1. Direct to S3 Upload
      const uniqueId = uuidv4();

      let coverUrl = null;
      if (simulatedUpload.coverBlob) {
        const coverKey = `covers/cover_${uniqueId}.${simulatedUpload.coverExt}`;
        coverUrl = await directUploadToS3(simulatedUpload.coverBlob, coverKey);
      }

      const selectedFileName = selectedFile instanceof File ? selectedFile.name : 'output.mp3';
      const ext = selectedFileName.split('.').pop()?.toLowerCase() || 'mp3';
      const trackKey = `tracks/${uniqueId}.${ext}`;
      const fileUrl = await directUploadToS3(selectedFile, trackKey);

      // 2. Save JSON to backend
      const uploadRes = await fetch("/api/tracks", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: simulatedUpload.title,
          artist: simulatedUpload.artist,
          album: "Unknown Album",
          duration: 0,
          fileUrl,
          coverUrl
        }),
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "Failed to upload track.");
      }

      // 3. Mark the request as completed
      const completeRes = await completeMusicRequest(request.id);

      if (completeRes.success) {
        setRequest((prev) => ({ ...prev, status: 'completed' }));
        setIsModalOpen(false);
        setSimulatedUpload(null);
        setSelectedFile(null);
      } else {
        throw new Error(completeRes.error || 'Failed to complete request');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An error occurred during upload.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelUpload = () => {
    setIsModalOpen(false);
    setSimulatedUpload(null);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    setIsDeleting(true);
    const res = await deleteMusicRequest(request.id);
    if (res.success) {
      toast.success('Request deleted.');
      if (onUpdate) onUpdate();
    } else {
      toast.error(res.error || 'Failed to delete request.');
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editSongName.trim() || !editArtist.trim()) return;

    setIsUpdating(true);
    const res = await updateMusicRequest(request.id, {
      targetMusicName: editSongName.trim(),
      targetArtist: editArtist.trim(),
    });

    if (res.success) {
      setRequest((prev) => ({
        ...prev,
        targetMusicName: editSongName.trim(),
        targetArtist: editArtist.trim()
      }));
      setIsEditing(false);
      setIsMenuOpen(false);
      toast.success('Request updated.');
    } else {
      toast.error(res.error || 'Failed to update request.');
    }
    setIsUpdating(false);
  };

  const isCompleted = request.status === 'completed';
  const isOwner = currentUserId === request.requesterId;

  if (isDeleting) {
    return null; // Optimistic unmount
  }

  return (
    <>
      <div
        className={`glass-panel p-5 flex flex-col gap-5 transition-all duration-300 ${
          isCompleted && !isEditing ? 'opacity-60 grayscale-[0.2]' : 'hover:bg-white/10'
        }`}
      >
        {/* Header - Requester & Status Badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-white/10 shadow-inner">
              <span className="text-sm font-bold text-white">
                {request.requesterName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">Requested by</p>
              <h3 className="text-lg font-bold text-white tracking-tight">{request.requesterName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {isCompleted && !isEditing && (
              <div className="glass-red px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(250,36,60,0.2)]">
                <CheckCircle2 size={14} className="text-apple-red" />
                <span className="text-xs font-bold text-apple-red uppercase tracking-wider">Completed</span>
              </div>
            )}

            {isOwner && !isCompleted && !isEditing && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <MoreVertical size={20} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-36 glass-panel overflow-hidden py-1 z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <button
                      onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-apple-red hover:bg-white/10 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Requirements Section / Edit Form */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3 relative">
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Edit Request</h4>
                <button onClick={() => { setIsEditing(false); setEditSongName(request.targetMusicName); setEditArtist(request.targetArtist); }} className="p-1 rounded-full hover:bg-white/10 text-zinc-400">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 font-medium mb-1">Song Name</label>
                <input
                  type="text"
                  value={editSongName}
                  onChange={(e) => setEditSongName(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-white outline-none focus:border-apple-red transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 font-medium mb-1">Artist Name</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-white outline-none focus:border-apple-red transition-colors"
                />
              </div>
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating || !editSongName.trim() || !editArtist.trim()}
                className="w-full mt-2 py-2 rounded-lg bg-apple-red text-white text-sm font-bold hover:bg-[#ff4057] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Save Changes</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Music size={16} className="text-zinc-500 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Target Music</p>
                  <p className="text-base font-semibold text-white">{request.targetMusicName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={16} className="text-zinc-500 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Target Artist</p>
                  <p className="text-sm font-medium text-zinc-300">{request.targetArtist}</p>
                </div>
              </div>

              {request.targetAlbum && (
                <div className="flex items-start gap-3">
                  <Disc3 size={16} className="text-zinc-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Target Album</p>
                    <p className="text-sm font-medium text-zinc-400">{request.targetAlbum}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Area */}
        {!isCompleted && !isEditing && (
          <>
            <input
              type="file"
              accept=".mp3, .wav, audio/mpeg, audio/wav, audio/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              className="w-full mt-2 py-3 px-4 rounded-xl flex items-center justify-center gap-2 bg-apple-red hover:bg-[#ff4057] text-white font-bold transition-all active:scale-95 shadow-lg shadow-apple-red/20"
            >
              {uploadProgress ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} strokeWidth={2.5} />}
              <span>{uploadProgress || "Upload Music"}</span>
            </button>
          </>
        )}
      </div>

      {/* Warning Modal */}
      {simulatedUpload && (
        <WarningModal
          isOpen={isModalOpen}
          request={request}
          uploadedInfo={{ musicName: simulatedUpload.title, artist: simulatedUpload.artist }}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelUpload}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
};
