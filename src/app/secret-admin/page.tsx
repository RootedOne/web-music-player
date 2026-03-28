import Link from "next/link";
import { Users, Music, Mic2, ListMusic } from "lucide-react";

export default function AdminDashboard() {
  const cards = [
    { name: "Users", href: "/secret-admin/users", icon: Users, description: "Manage platform accounts and access.", color: "from-blue-500/20 to-blue-900/20" },
    { name: "Tracks", href: "/secret-admin/tracks", icon: Music, description: "Manage uploaded audio and relations.", color: "from-purple-500/20 to-purple-900/20" },
    { name: "Artists", href: "/secret-admin/artists", icon: Mic2, description: "Manage artist profiles and covers.", color: "from-orange-500/20 to-orange-900/20" },
    { name: "Playlists", href: "/secret-admin/playlists", icon: ListMusic, description: "Manage collections and track lists.", color: "from-green-500/20 to-green-900/20" },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to the Sepatifay secure administration panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-8">
        {cards.map((card) => (
          <Link
            key={card.name}
            href={card.href}
            className={`relative overflow-hidden bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-[#fa243c]/50 hover:shadow-[0_0_30px_rgba(250,36,60,0.15)] transition-all duration-300`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-[#fa243c] transition-all duration-300 shadow-xl">
                <card.icon className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#fa243c] transition-colors">{card.name}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}