import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return;

  const drake = await prisma.artist.create({ data: { name: "Drake" } });

  await prisma.track.create({
      data: {
          title: "Artist Page Seed Song",
          artist: "Drake",
          artistId: drake.id,
          duration: 180,
          fileUrl: "/dummy.mp3",
          userId: user.id
      }
  });
  console.log("Seeded Drake and his track");
}
main().catch(console.error).finally(() => prisma.$disconnect());
