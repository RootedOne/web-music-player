'use client';

import React, { useState } from 'react';
import { MusicRequest } from './mockData';
import { WarningModal, UploadedTrackInfo } from './WarningModal';
import { Upload, CheckCircle2, Music, User, Disc3 } from 'lucide-react';

interface RequestCardProps {
  request: MusicRequest;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request: initialRequest }) => {
  const [request, setRequest] = useState<MusicRequest>(initialRequest);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulatedUpload, setSimulatedUpload] = useState<UploadedTrackInfo | null>(null);

  const handleUploadClick = () => {
    // Simulate detecting a mismatched file
    const mismatchedTrack: UploadedTrackInfo = {
      musicName: request.targetMusicName === 'Blinding Lights' ? 'Starboy' : 'Unknown Track',
      artist: request.targetArtist === 'The Weeknd' ? 'The Weeknd feat. Daft Punk' : 'Unknown Artist',
      album: 'Unknown Album',
    };

    setSimulatedUpload(mismatchedTrack);
    setIsModalOpen(true);
  };

  const handleConfirmUpload = () => {
    // Transition to completed state
    setRequest((prev) => ({ ...prev, status: 'completed' }));
    setIsModalOpen(false);
    setSimulatedUpload(null);
  };

  const handleCancelUpload = () => {
    setIsModalOpen(false);
    setSimulatedUpload(null);
  };

  const isCompleted = request.status === 'completed';

  return (
    <>
      <div
        className={`glass-panel p-5 flex flex-col gap-5 transition-all duration-300 ${
          isCompleted ? 'opacity-60 grayscale-[0.2]' : 'hover:bg-white/10'
        }`}
      >
        {/* Header - Requester & Status Badge */}
        <div className="flex items-center justify-between">
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

          {isCompleted && (
            <div className="glass-red px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(250,36,60,0.2)]">
              <CheckCircle2 size={14} className="text-apple-red" />
              <span className="text-xs font-bold text-apple-red uppercase tracking-wider">Completed</span>
            </div>
          )}
        </div>

        {/* Requirements Section */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
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
        </div>

        {/* Action Area */}
        {!isCompleted && (
          <button
            onClick={handleUploadClick}
            className="w-full mt-2 py-3 px-4 rounded-xl flex items-center justify-center gap-2 bg-apple-red hover:bg-[#ff4057] text-white font-bold transition-all active:scale-95 shadow-lg shadow-apple-red/20"
          >
            <Upload size={18} strokeWidth={2.5} />
            <span>Upload Music</span>
          </button>
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
        />
      )}
    </>
  );
};
