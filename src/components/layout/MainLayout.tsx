import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-transparent overflow-hidden font-sans text-gray-100 w-full relative z-0">

      {/* Desktop Sidebar wrapping */}
      <div className="hidden md:flex h-full p-4 pr-0">
         <Sidebar />
      </div>

      {/* Main Content Area - Glassmorphic Wrapper */}
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden md:p-4 z-10">
        <main className="flex-1 overflow-y-auto bg-white/[0.03] backdrop-blur-3xl md:border md:border-white/10 md:rounded-3xl shadow-2xl w-full pt-0 md:pt-0 transition-all">
          <div className="p-4 pt-8 md:p-10 w-full min-h-full pb-[160px] md:pb-32">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Nav & PlayerBar are absolutely positioned or fixed inside these components */}
      <div className="md:hidden z-50 relative">
        <Sidebar />
      </div>
      <PlayerBar />

    </div>
  );
}
