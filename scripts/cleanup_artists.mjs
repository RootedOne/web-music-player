import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Artist Database Cleanup...");

  // 1. Find all Artist records containing common delimiters
  const dirtyArtists = await prisma.artist.findMany({
    where: {
      OR: [
        { name: { contains: '&' } },
        { name: { contains: ',' } },
        { name: { contains: ' feat.' } },
        { name: { contains: ' feat ' } },
        { name: { contains: ' ft.' } },
        { name: { contains: ' ft ' } },
        { name: { contains: ' featuring ' } },
        { name: { contains: ' x ' } },
        { name: { contains: ' X ' } },
      ],
    },
    include: {
      tracks: true,
    }
  });

  if (dirtyArtists.length === 0) {
    console.log("No dirty artist records found. Database is clean.");
    return;
  }

  console.log(`Found ${dirtyArtists.length} dirty artist records. Processing...`);

  for (const dirtyArtist of dirtyArtists) {
    console.log(`\nProcessing: "${dirtyArtist.name}" (ID: ${dirtyArtist.id})`);

    // 2. Parse the name using the RegEx utility
    const splitNames = dirtyArtist.name
      .split(/,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+[xX]\s+/i)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (splitNames.length <= 1) {
      console.log(`  - Skipping: Split resulted in <= 1 name (Result: ${JSON.stringify(splitNames)})`);
      continue;
    }

    console.log(`  - Split into:`, splitNames);

    // 3. Upsert clean artists
    const cleanArtistRecords = await Promise.all(
      splitNames.map(async (name) => {
        return prisma.artist.upsert({
          where: { name },
          update: {
            // Only update image if the new artist doesn't have one, but the dirty one did
            ...(dirtyArtist.imageUrl ? { imageUrl: dirtyArtist.imageUrl } : {}),
          },
          create: {
            name,
            imageUrl: dirtyArtist.imageUrl,
          },
        });
      })
    );

    console.log(`  - Upserted ${cleanArtistRecords.length} clean artists.`);

    // 4. Update track relationships
    if (dirtyArtist.tracks.length > 0) {
      console.log(`  - Reassigning ${dirtyArtist.tracks.length} tracks...`);
      for (const track of dirtyArtist.tracks) {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            artists: {
              // Connect the new clean artists
              connect: cleanArtistRecords.map(a => ({ id: a.id })),
              // Disconnect the old dirty artist
              disconnect: { id: dirtyArtist.id }
            }
          }
        });
      }
      console.log(`  - Tracks reassigned successfully.`);
    }

    // 5. Delete the dirty artist record
    await prisma.artist.delete({
      where: { id: dirtyArtist.id }
    });

    console.log(`  - Deleted legacy artist record: "${dirtyArtist.name}"`);
  }

  console.log("\nCleanup Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
