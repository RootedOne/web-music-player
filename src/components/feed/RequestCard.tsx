'use client';

import React, { useState, useRef } from 'react';
import { MusicRequest } from './mockData';
import { WarningModal, UploadedTrackInfo } from './WarningModal';
import { Upload, CheckCircle2, Music, User, Disc3, MoreVertical, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { completeMusicRequest, updateMusicRequest, deleteMusicRequest } from '@/actions/musicRequests';
import toast from 'react-hot-toast';
import * as mm from 'music-metadata-browser';

interface RequestCardProps {
  request: MusicRequest;
  currentUserId?: string;
  onUpdate?: () => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request: initialRequest, currentUserId, onUpdate }) => {
  const [request, setRequest] = useState<MusicRequest>(initialRequest);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulatedUpload, setSimulatedUpload] = useState<UploadedTrackInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit & Delete State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSongName, setEditSongName] = useState(initialRequest.targetMusicName);
  const [editArtist, setEditArtist] = useState(initialRequest.targetArtist);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We use a clean name parsing to simulate metadata before actual upload
    // because full extraction requires Node.js `music-metadata` on the server.
    // We strip the extension to get a reasonable guess of the track name.
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    let guessedTitle = rawName;
    let guessedArtist = "Unknown Artist";

    // Attempt to parse standard "Artist - Title" format often found in filenames
    if (rawName.includes(" - ")) {
      const parts = rawName.split(" - ");
      guessedArtist = parts[0].trim();
      guessedTitle = parts[1].trim();
    }

    const trackInfo: UploadedTrackInfo = {
      musicName: guessedTitle,
      artist: guessedArtist,
      album: 'Unknown Album', // Basic guess, accurate metadata will parse on backend
    };

    setSelectedFile(file);
    setSimulatedUpload(trackInfo);
    setIsModalOpen(true);

    // Reset file input so the same file can trigger onChange again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setIsUpdating(true);

    try {
      // 1. Extract Metadata
      let title = selectedFile.name.replace(/\.[^/.]+$/, "");
      let artist = "Unknown Artist";
      let album = "Unknown Album";
      let duration = 0;
      let coverBlob: Blob | null = null;
      let coverMimeType = "image/jpeg";

      try {
        const metadata = await mm.parseBlob(selectedFile);
        if (metadata.common.title) title = metadata.common.title;
        if (metadata.common.artist) artist = metadata.common.artist;
        if (metadata.common.album) album = metadata.common.album;
        if (metadata.format.duration) duration = metadata.format.duration;

        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          coverBlob = new Blob([new Uint8Array(picture.data).buffer], { type: picture.format });
          coverMimeType = picture.format;
        }
      } catch (metaErr) {
        console.warn(`Could not parse ID3 tags for ${selectedFile.name}:`, metaErr);
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

      // 3. Request Presigned URLs
      const fileMimeType = selectedFile.type || "application/octet-stream";
      const filesToUpload = [{ name: selectedFile.name, type: fileMimeType }];
      if (coverBlob) {
        filesToUpload.push({ name: `cover-${selectedFile.name}.jpg`, type: coverMimeType });
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
        body: selectedFile,
      });

      if (!trackUploadRes.ok) {
        const errText = await trackUploadRes.text();
        throw new Error(`Failed to upload ${selectedFile.name} to cloud. Status: ${trackUploadRes.status}. Error: ${errText}`);
      }

      let coverUrl = null;
      if (coverBlob && coverUploadInfo) {
         const coverUploadRes = await fetch(coverUploadInfo.presignedUrl, {
            method: "PUT",
            body: coverBlob,
         });
         if (coverUploadRes.ok) {
           coverUrl = coverUploadInfo.publicUrl;
         }
      }

      // 5. Save Record to Database via JSON API
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
        const errorData = await saveRes.json();
        throw new Error(errorData.error || "Failed to upload track.");
      }

      // 6. Mark the request as completed
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
              <Upload size={18} strokeWidth={2.5} />
              <span>Upload Music</span>
            </button>
          </>
        )}
      </div>

      {/* Warning Modal */}
      {simulatedUpload && (
        <WarningModal
          isOpen={isModalOpen}
          request={request}
          uploadedInfo={simulatedUpload}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelUpload}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
};
