import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-gray-900 overflow-hidden font-sans text-gray-100 w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
        {/* pt-0 on mobile since we removed top-bar */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#181818] to-black w-full pt-0 md:pt-0">
          <div className="p-4 pt-8 md:p-8 w-full min-h-full pb-[140px] md:pb-32">
            {/* pb-[140px] ensures content doesn't get hidden behind Spotify-style Mobile Nav + PlayerBar */}
            {children}
          </div>
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}
