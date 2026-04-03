import React from 'react';
import { MusicRequestFeed } from '@/components/feed/MusicRequestFeed';

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-apple-red/20 via-apple-dark to-apple-dark">
      {/*
        Optional: extra ambient glowing orbs for deeper glassmorphism refraction
        Uncomment if you want stronger ambient red glows in the background
      */}
      {/* <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-apple-red/20 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen" /> */}
      {/* <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-apple-red/10 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-screen" /> */}

      <div className="pt-4 sm:pt-8">
        <MusicRequestFeed />
      </div>
    </main>
  );
}
