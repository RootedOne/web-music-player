import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return;

  await prisma.track.create({
      data: {
          title: "Multi Artist Test Song",
          artist: "Drake feat. Lil Baby, Future",
          duration: 180,
          fileUrl: "/dummy.mp3",
          userId: user.id
      }
  });
  console.log("Seeded multi artist track");
}
main().catch(console.error).finally(() => prisma.$disconnect());
