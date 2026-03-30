import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import * as mm from 'music-metadata';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  try {
    const username = await askQuestion('Enter the username to assign imported tracks to: ');
    const cleanedUsername = username.trim();

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { username: cleanedUsername }
    });

    if (!user) {
      console.error(`\nError: User '${cleanedUsername}' not found in the database. Please create the user first.`);
      process.exit(1);
    }

    const inputPath = await askQuestion('Enter the Linux directory path to scan for music (e.g., /home/user/Music): ');
    const targetDir = path.resolve(inputPath);

    try {
      // Check if directory exists and is accessible
      const stats = await fs.stat(targetDir);
      if (!stats.isDirectory()) {
        console.error(`\nError: The path '${targetDir}' is not a directory.`);
        process.exit(1);
      }

      // Check read permissions
      await fs.access(targetDir, fs.constants.R_OK);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`\nError: The directory '${targetDir}' does not exist.`);
      } else if (error.code === 'EACCES') {
        console.error(`\nError: Permission denied. Cannot read directory '${targetDir}'.`);
      } else {
        console.error(`\nError accessing directory '${targetDir}': ${error.message}`);
      }
      process.exit(1);
    }

    console.log(`\nStarting import for user '${username}' from directory '${targetDir}'...`);

    const audioExtensions = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a']);
    const discoveredFiles: string[] = [];
    const resolvedPaths = new Set<string>();

    async function walkDir(currentDir: string) {
      try {
        const realPath = await fs.realpath(currentDir);
        if (resolvedPaths.has(realPath)) {
          console.log(`Skipping symlink loop or already visited directory: ${currentDir}`);
          return;
        }
        resolvedPaths.add(realPath);

        const files = await fs.readdir(currentDir, { withFileTypes: true });

        for (const file of files) {
          const fullPath = path.join(currentDir, file.name);

          try {
            if (file.isDirectory()) {
              await walkDir(fullPath);
            } else if (file.isSymbolicLink()) {
              const linkTarget = await fs.realpath(fullPath);
              const linkStat = await fs.stat(linkTarget);

              if (linkStat.isDirectory()) {
                await walkDir(linkTarget);
              } else if (linkStat.isFile() && audioExtensions.has(path.extname(linkTarget).toLowerCase())) {
                discoveredFiles.push(linkTarget);
              }
            } else if (file.isFile() && audioExtensions.has(path.extname(fullPath).toLowerCase())) {
              discoveredFiles.push(fullPath);
            }
          } catch (fileError: any) {
             if (fileError.code === 'EACCES') {
               console.warn(`Permission denied: Skipping file/directory '${fullPath}'`);
             } else {
               console.warn(`Error processing '${fullPath}': ${fileError.message}`);
             }
          }
        }
      } catch (dirError: any) {
        if (dirError.code === 'EACCES') {
          console.warn(`Permission denied: Skipping directory '${currentDir}'`);
        } else {
          console.warn(`Error reading directory '${currentDir}': ${dirError.message}`);
        }
      }
    }

    await walkDir(targetDir);

    console.log(`Found ${discoveredFiles.length} audio files. Processing...`);

    const coverArtCache = new Map<string, string>(); // Map hash to relative path
    let successCount = 0;
    let errorCount = 0;

    for (const filePath of discoveredFiles) {
      try {
        console.log(`Processing: ${filePath}`);

        // Parse metadata
        const metadata = await mm.parseFile(filePath, { duration: true });

        const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
        const artistName = metadata.common.artist || 'Unknown Artist';
        const album = metadata.common.album || 'Unknown Album';
        const duration = metadata.format.duration || 0;

        // Handle cover art
        let coverUrl = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          const hash = crypto.createHash('md5').update(picture.data).digest('hex');

          if (coverArtCache.has(hash)) {
            coverUrl = coverArtCache.get(hash)!;
          } else {
            // Save new cover art
            let ext = 'jpg';
            if (picture.format.includes('png')) ext = 'png';
            else if (picture.format.includes('webp')) ext = 'webp';
            else if (picture.format.includes('gif')) ext = 'gif';

            const coverFileName = `cover_${hash}.${ext}`;
            const coverPath = path.join(process.cwd(), 'public', 'uploads', 'covers', coverFileName);

            await fs.writeFile(coverPath, picture.data);
            coverUrl = `/uploads/covers/${coverFileName}`;
            coverArtCache.set(hash, coverUrl);
          }
        }

        // Generate safe track filename
        const originalExt = path.extname(filePath);
        const baseName = path.basename(filePath, originalExt)
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const fileHash = crypto.randomBytes(4).toString('hex');
        const newFileName = `${baseName}_${fileHash}${originalExt}`;
        const targetFilePath = path.join(process.cwd(), 'public', 'uploads', 'tracks', newFileName);

        // Copy audio file
        await fs.copyFile(filePath, targetFilePath);
        const fileUrl = `/uploads/tracks/${newFileName}`;

        // Upsert artist
        const artistRecord = await prisma.artist.upsert({
          where: { name: artistName },
          update: {},
          create: { name: artistName },
        });

        // Insert track into DB
        await prisma.track.create({
          data: {
            title,
            artist: artistName,
            album,
            duration,
            fileUrl,
            coverUrl,
            userId: user.id,
            artists: {
              connect: { id: artistRecord.id }
            }
          }
        });

        successCount++;
      } catch (fileError: any) {
        console.error(`Error processing file '${filePath}': ${fileError.message}`);
        errorCount++;
      }
    }

    console.log(`\nImport Summary:`);
    console.log(`Successfully imported: ${successCount} files.`);
    console.log(`Failed to import: ${errorCount} files.`);

  } catch (error) {
    console.error('An unexpected error occurred:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
