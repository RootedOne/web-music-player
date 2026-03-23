import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const artist = await prisma.artist.findFirst({ where: { name: 'Drake' } });
  if (artist) {
    console.log(artist.id);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
