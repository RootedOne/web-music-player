import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
const ffmpeg = require('fluent-ffmpeg');
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const ENDPOINT = process.env.S3_ENDPOINT || '';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function convertToFlac(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('flac')
      .on('error', (err: Error) => {
        reject(err);
      })
      .on('end', () => {
        resolve();
      })
      .save(outputPath);
  });
}

function findLocalPath(url: string): string | null {
  // e.g. /uploads/tracks/foo.mp3 or uploads/tracks/foo.mp3
  // Strip leading slash to make path joining consistent
  const relativePath = url.startsWith('/') ? url.substring(1) : url;

  const publicPath = path.join(process.cwd(), 'public', relativePath);
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }

  const rootPath = path.join(process.cwd(), relativePath);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  return null;
}

async function uploadFileToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  // Assuming S3_ENDPOINT does not have a trailing slash
  return `${ENDPOINT}/${BUCKET_NAME}/${key}`;
}

async function migrateFileUrl(url: string | null | undefined, type: 'track' | 'cover'): Promise<string | null> {
  if (!url || url.startsWith('http://') || url.startsWith('https://')) {
    return url || null;
  }

  const localPath = findLocalPath(url);

  if (!localPath) {
    console.warn(`[WARNING] File missing locally: ${url}`);
    return url; // Keep old URL if file doesn't exist, or return null? Let's keep old URL.
  }

  const ext = path.extname(localPath).toLowerCase();
  let buffer: Buffer;
  let finalExt = ext;
  let finalContentType = mime.lookup(ext) || 'application/octet-stream';

  if (type === 'track') {
    if (ext === '.wav' || ext === '.aiff') {
      const tempPath = path.join(process.cwd(), `temp_${uuidv4()}.flac`);
      console.log(`  Converting ${localPath} to FLAC...`);
      await convertToFlac(localPath, tempPath);
      buffer = fs.readFileSync(tempPath);
      fs.unlinkSync(tempPath);
      finalExt = '.flac';
      finalContentType = 'audio/flac';
    } else {
      buffer = fs.readFileSync(localPath);
    }
  } else {
    buffer = fs.readFileSync(localPath);
  }

  const prefix = type === 'track' ? 'tracks' : 'covers';
  const newKey = `${prefix}/legacy_${uuidv4()}${finalExt}`;

  console.log(`  Uploading ${newKey} to S3...`);
  const newUrl = await uploadFileToS3(buffer, newKey, finalContentType);
  return newUrl;
}

async function main() {
  console.log('Starting migration to S3...');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Bucket: ${BUCKET_NAME}`);

  if (!BUCKET_NAME || !ENDPOINT) {
    console.error('Missing S3_BUCKET_NAME or S3_ENDPOINT in environment variables.');
    process.exit(1);
  }

  // 1. Migrate Tracks
  const tracks = await prisma.track.findMany({
    where: {
      OR: [
        { fileUrl: { startsWith: '/uploads/' } },
        { fileUrl: { startsWith: 'uploads/' } },
        { coverUrl: { startsWith: '/uploads/' } },
        { coverUrl: { startsWith: 'uploads/' } },
      ],
    },
  });

  console.log(`Found ${tracks.length} tracks to process.`);
  let count = 0;
  for (const track of tracks) {
    count++;
    console.log(`Migrating Track ${count}/${tracks.length}: [${track.title}]...`);
    try {
      let newFileUrl = track.fileUrl;
      let newCoverUrl = track.coverUrl;

      if (!track.fileUrl.startsWith('http')) {
        newFileUrl = await migrateFileUrl(track.fileUrl, 'track') || track.fileUrl;
      }

      if (track.coverUrl && !track.coverUrl.startsWith('http')) {
        newCoverUrl = await migrateFileUrl(track.coverUrl, 'cover') || track.coverUrl;
      }

      if (newFileUrl !== track.fileUrl || newCoverUrl !== track.coverUrl) {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            fileUrl: newFileUrl,
            coverUrl: newCoverUrl,
          },
        });
        console.log(`  Successfully updated Track ID: ${track.id}`);
      } else {
        console.log(`  No changes needed or file missing for Track ID: ${track.id}`);
      }
    } catch (err) {
      console.error(`  [ERROR] Failed to migrate track ${track.id}:`, err);
    }

    // Add artificial delay to prevent rate-limiting or DNS lookup errors
    await delay(500);
  }

  // 2. Migrate Artists
  const artists = await prisma.artist.findMany({
    where: {
      OR: [
        { imageUrl: { startsWith: '/uploads/' } },
        { imageUrl: { startsWith: 'uploads/' } },
      ],
    },
  });

  console.log(`Found ${artists.length} artists to process.`);
  count = 0;
  for (const artist of artists) {
    count++;
    console.log(`Migrating Artist ${count}/${artists.length}: [${artist.name}]...`);
    try {
      if (artist.imageUrl && !artist.imageUrl.startsWith('http')) {
        const newImageUrl = await migrateFileUrl(artist.imageUrl, 'cover') || artist.imageUrl;
        if (newImageUrl !== artist.imageUrl) {
          await prisma.artist.update({
            where: { id: artist.id },
            data: { imageUrl: newImageUrl },
          });
          console.log(`  Successfully updated Artist ID: ${artist.id}`);
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Failed to migrate artist ${artist.id}:`, err);
    }

    // Add artificial delay to prevent rate-limiting or DNS lookup errors
    await delay(500);
  }

  // 3. Migrate Playlists
  const playlists = await prisma.playlist.findMany({
    where: {
      OR: [
        { coverUrl: { startsWith: '/uploads/' } },
        { coverUrl: { startsWith: 'uploads/' } },
      ],
    },
  });

  console.log(`Found ${playlists.length} playlists to process.`);
  count = 0;
  for (const playlist of playlists) {
    count++;
    console.log(`Migrating Playlist ${count}/${playlists.length}: [${playlist.name}]...`);
    try {
      if (playlist.coverUrl && !playlist.coverUrl.startsWith('http')) {
        const newCoverUrl = await migrateFileUrl(playlist.coverUrl, 'cover') || playlist.coverUrl;
        if (newCoverUrl !== playlist.coverUrl) {
          await prisma.playlist.update({
            where: { id: playlist.id },
            data: { coverUrl: newCoverUrl },
          });
          console.log(`  Successfully updated Playlist ID: ${playlist.id}`);
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Failed to migrate playlist ${playlist.id}:`, err);
    }

    // Add artificial delay to prevent rate-limiting or DNS lookup errors
    await delay(500);
  }

  console.log('Migration completed.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal error during migration:', e);
  prisma.$disconnect();
  process.exit(1);
});
