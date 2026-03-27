import Link from "next/link";
import { headers } from "next/headers";
import { LayoutDashboard, Users, Music, Mic2, ListMusic, ArrowLeft } from "lucide-react";
import { AdminSearch } from "@/components/admin/AdminSearch";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPath = headers().get("x-invoke-path") || "/secret-admin";

  const navLinks = [
    { name: "Dashboard", href: "/secret-admin", icon: LayoutDashboard },
    { name: "Users", href: "/secret-admin/users", icon: Users },
    { name: "Tracks", href: "/secret-admin/tracks", icon: Music },
    { name: "Artists", href: "/secret-admin/artists", icon: Mic2 },
    { name: "Playlists", href: "/secret-admin/playlists", icon: ListMusic },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white font-sans selection:bg-[#fa243c]/30">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-neutral-900/80 backdrop-blur-xl border-r border-white/10 p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-xl bg-[#fa243c] flex items-center justify-center shadow-[0_0_15px_rgba(250,36,60,0.5)]">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Admin</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? "text-[#fa243c]" : ""}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-white/10 mt-auto">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Mobile Top Tab-Bar */}
      <header className="md:hidden sticky top-0 z-50 bg-neutral-900/90 backdrop-blur-xl border-b border-white/10 w-full">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-[#fa243c] flex items-center justify-center shadow-[0_0_15px_rgba(250,36,60,0.5)]">
               <LayoutDashboard className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-lg font-bold">Admin</h1>
          </div>
          <Link href="/" className="p-2 rounded-full bg-white/5 text-gray-300 active:scale-95 transition-transform">
             <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Scrollable Horizontal Nav */}
        <nav className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-3 gap-2">
          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex-shrink-0 snap-start flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-gray-400 bg-white/5 border border-transparent"
                }`}
              >
                <link.icon className={`w-4 h-4 ${isActive ? "text-[#fa243c]" : ""}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-full overflow-x-hidden relative">
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 pb-32 md:pb-8 flex-1 flex flex-col">
          {/* Admin Search */}
          <div className="mb-8">
             <AdminSearch />
          </div>

          {children}
        </div>
      </main>

    </div>
  );
}