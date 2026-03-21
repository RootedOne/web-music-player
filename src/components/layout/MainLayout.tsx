import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-gray-900 overflow-hidden font-sans text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full pt-16 md:pt-0 pb-24 md:pb-24">
        {/* pb-24 ensures content doesn't get hidden behind PlayerBar. pt-16 accounts for mobile header */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-800 to-gray-950 p-4 md:p-8 hide-scrollbar w-full">
          {children}
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}
