import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { prisma } from "@/lib/prisma";
import TrackCard from "@/components/TrackCard";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    take: 24, // Show latest 24 uploaded globally
  });

  return (
    <MainLayout>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          Discover
        </h1>
        <div className="flex items-center gap-4">
          <div className="bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-300">
            {session.user?.name?.[0].toUpperCase()}
          </div>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Global Feed</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
           {tracks.length === 0 ? (
             <div className="col-span-full text-gray-500 py-8">
               No tracks have been uploaded to the platform yet. Be the first!
             </div>
           ) : (
             tracks.map(track => (
               <TrackCard key={track.id} track={track} />
             ))
           )}
        </div>
      </section>
    </MainLayout>
  );
}
