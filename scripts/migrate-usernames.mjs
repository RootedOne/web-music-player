import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting username migration to lowercase...')

  const users = await prisma.user.findMany()
  console.log(`Found ${users.length} users.`)

  let updatedCount = 0;
  for (const user of users) {
    const lowerUsername = user.username.toLowerCase();
    if (user.username !== lowerUsername) {
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { username: lowerUsername }
            });
            console.log(`Updated user: ${user.username} -> ${lowerUsername}`);
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update user ${user.username}. It's possible another user already exists with the lowercase name. Error:`, error.message);
        }
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} users.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
