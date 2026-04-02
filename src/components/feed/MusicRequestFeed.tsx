import React from 'react';
import { mockMusicRequests } from './mockData';
import { RequestCard } from './RequestCard';

export const MusicRequestFeed: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-4 px-4 py-4 glass-panel rounded-none border-x-0 border-t-0 border-b-white/5 mb-2 backdrop-blur-2xl bg-black/40">
        <h1 className="text-2xl font-bold text-white tracking-tight">Music Requests</h1>
        <p className="text-sm text-zinc-400 mt-1">Fulfill requests to earn community points.</p>
      </div>

      {/* Feed List */}
      <div className="flex flex-col gap-5 px-4 sm:px-0">
        {mockMusicRequests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
};
