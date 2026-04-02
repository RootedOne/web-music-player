'use client';

import React, { useState, useMemo } from 'react';
import { mockMusicRequests, MusicRequest } from './mockData';
import { RequestCard } from './RequestCard';
import { Plus } from 'lucide-react';

type FilterType = 'recent' | 'oldest' | 'random';

export const MusicRequestFeed: React.FC = () => {
  const [requests, setRequests] = useState<MusicRequest[]>(mockMusicRequests);
  const [filter, setFilter] = useState<FilterType>('recent');

  const [newSongName, setNewSongName] = useState('');
  const [newArtist, setNewArtist] = useState('');

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongName.trim() || !newArtist.trim()) return;

    const newRequest: MusicRequest = {
      id: `req-${Date.now()}`,
      requesterName: 'You',
      targetMusicName: newSongName.trim(),
      targetArtist: newArtist.trim(),
      status: 'pending',
    };

    setRequests((prev) => [newRequest, ...prev]);
    setNewSongName('');
    setNewArtist('');
  };

  const sortedRequests = useMemo(() => {
    const list = [...requests];
    switch (filter) {
      case 'recent':
        // Default order, assuming newest is at the top of the array
        return list;
      case 'oldest':
        return list.reverse();
      case 'random':
        return list.sort(() => Math.random() - 0.5);
      default:
        return list;
    }
  }, [requests, filter]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-4 px-4 py-4 glass-panel rounded-none border-x-0 border-t-0 border-b-white/5 mb-2 backdrop-blur-2xl bg-black/40">
        <h1 className="text-2xl font-bold text-white tracking-tight">Music Requests</h1>
        <p className="text-sm text-zinc-400 mt-1">Fulfill requests to earn community points.</p>
      </div>

      <div className="px-4 sm:px-0 flex flex-col gap-6">
        {/* Composer Section */}
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-sm font-bold text-white mb-4 tracking-wider uppercase">Make a Request</h2>
          <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Song Name"
              value={newSongName}
              onChange={(e) => setNewSongName(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-500 outline-none focus:border-apple-red transition-colors"
            />
            <input
              type="text"
              placeholder="Artist Name"
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-500 outline-none focus:border-apple-red transition-colors"
            />
            <button
              type="submit"
              disabled={!newSongName.trim() || !newArtist.trim()}
              className="mt-2 py-3 px-4 rounded-xl flex items-center justify-center gap-2 bg-apple-red text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff4057] active:scale-95 shadow-lg shadow-apple-red/20"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Submit Request</span>
            </button>
          </form>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
          {(['recent', 'oldest', 'random'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
                filter === f
                  ? 'glass-red text-white shadow-lg shadow-apple-red/10'
                  : 'glass-panel text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Feed List */}
        <div className="flex flex-col gap-5">
          {sortedRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </div>
  );
};
