import React from 'react';
import { MusicRequest } from './mockData';

export interface UploadedTrackInfo {
  musicName: string;
  artist: string;
  album?: string;
}

interface WarningModalProps {
  isOpen: boolean;
  request: MusicRequest;
  uploadedInfo: UploadedTrackInfo;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  request,
  uploadedInfo,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isNameMismatch = request.targetMusicName !== uploadedInfo.musicName;
  const isArtistMismatch = request.targetArtist !== uploadedInfo.artist;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-modal w-full max-w-lg p-6 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Mismatched Details Detected</h2>
          <p className="text-zinc-400 text-sm">
            The track you are uploading doesn&apos;t match the requested details exactly. Are you sure you want to proceed?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Requested Info */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Requested</h3>
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
            <h3 className="text-xs uppercase tracking-wider text-apple-red font-semibold mb-1">Detected</h3>
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
            className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-apple-red hover:bg-[#ff4057] shadow-[0_0_15px_rgba(250,36,60,0.4)] transition-all active:scale-95"
          >
            Upload Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
