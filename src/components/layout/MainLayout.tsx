import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden font-sans text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col relative pb-24">
        {/* pb-24 ensures content doesn't get hidden behind PlayerBar */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-800 to-gray-950 p-8 hide-scrollbar">
          {children}
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}
