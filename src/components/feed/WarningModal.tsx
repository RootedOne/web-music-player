'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MusicRequest } from './mockData';

export interface UploadedTrackInfo {
  musicName: string;
  artist: string;
  album?: string;
}

import { Loader2 } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  request: MusicRequest;
  uploadedInfo: UploadedTrackInfo;
  onConfirm: () => void;
  onCancel: () => void;
  isUpdating?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  request,
  uploadedInfo,
  onConfirm,
  onCancel,
  isUpdating = false,
  title = "Mismatched Details Detected",
  description = "The track you are uploading doesn't match the requested details exactly. Are you sure you want to proceed?",
  confirmText = "Upload Anyway",
  leftLabel = "Requested",
  rightLabel = "Detected",
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isNameMismatch = request.targetMusicName.toLowerCase() !== uploadedInfo.musicName.toLowerCase();
  const isArtistMismatch = request.targetArtist.toLowerCase() !== uploadedInfo.artist.toLowerCase();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-modal w-full max-w-lg p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto hide-scrollbar animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-zinc-400 text-sm">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Requested Info */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{leftLabel}</h3>
            <div>
              <span className="block text-xs text-zinc-400">Song</span>
              <span className="font-medium text-white">{request.targetMusicName}</span>
            </div>
            <div>
              <span className="block text-xs text-zinc-400">Artist</span>
              <span className="font-medium text-white">{request.targetArtist}</span>
            </div>
            {request.targetAlbum && (
              <div>
                <span className="block text-xs text-zinc-400">Album</span>
                <span className="font-medium text-white">{request.targetAlbum}</span>
              </div>
            )}
          </div>

          {/* Uploaded Info */}
          <div className="glass-panel p-4 flex flex-col gap-3 border-l-2 border-l-apple-red/50">
            <h3 className="text-xs uppercase tracking-wider text-apple-red font-semibold mb-1">{rightLabel}</h3>
            <div>
              <span className="block text-xs text-zinc-400">Song</span>
              <span className={`font-medium ${isNameMismatch ? 'text-apple-red' : 'text-white'}`}>
                {uploadedInfo.musicName}
              </span>
            </div>
            <div>
              <span className="block text-xs text-zinc-400">Artist</span>
              <span className={`font-medium ${isArtistMismatch ? 'text-apple-red' : 'text-white'}`}>
                {uploadedInfo.artist}
              </span>
            </div>
            {uploadedInfo.album && (
              <div>
                <span className="block text-xs text-zinc-400">Album</span>
                <span className="font-medium text-white">{uploadedInfo.album}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-apple-red hover:bg-[#ff4057] shadow-[0_0_15px_rgba(250,36,60,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{isUpdating ? 'Updating...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
