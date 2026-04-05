import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, _Object } from '@aws-sdk/client-s3';
import * as path from 'path';

const isConfirm = process.argv.includes('--confirm');

if (!isConfirm) {
  console.log('\x1b[33m%s\x1b[0m', 'DRY RUN MODE: No files will actually be deleted. Run with --confirm to execute.');
}

const prisma = new PrismaClient();

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const ENDPOINT = process.env.S3_ENDPOINT || '';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function extractS3Key(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefixToRemove = `${ENDPOINT}/${BUCKET_NAME}/`;
  if (url.startsWith(prefixToRemove)) {
    return url.replace(prefixToRemove, '');
  }
  // If it's a local file or different domain, we don't track it as an S3 key
  return null;
}

function isSystemFile(key: string): boolean {
  if (key.endsWith('/')) return true; // It's a "folder"
  const filename = path.basename(key);
  if (filename.startsWith('.')) return true; // e.g. .DS_Store
  return false;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  if (!BUCKET_NAME || !ENDPOINT) {
    console.error('Missing S3_BUCKET_NAME or S3_ENDPOINT in environment variables.');
    process.exit(1);
  }

  console.log('Fetching database records...');

  // 1. Fetch the "Source of Truth"
  const tracks = await prisma.track.findMany({ select: { fileUrl: true, coverUrl: true } });
  const artists = await prisma.artist.findMany({ select: { imageUrl: true } });
  const playlists = await prisma.playlist.findMany({ select: { coverUrl: true } });

  const validKeys = new Set<string>();

  for (const track of tracks) {
    const fileKey = extractS3Key(track.fileUrl);
    if (fileKey) validKeys.add(fileKey);

    const coverKey = extractS3Key(track.coverUrl);
    if (coverKey) validKeys.add(coverKey);
  }

  for (const artist of artists) {
    const imageKey = extractS3Key(artist.imageUrl);
    if (imageKey) validKeys.add(imageKey);
  }

  for (const playlist of playlists) {
    const coverKey = extractS3Key(playlist.coverUrl);
    if (coverKey) validKeys.add(coverKey);
  }

  console.log(`Found ${validKeys.size} valid file keys in the database.`);
  console.log('Fetching cloud objects...');

  // 2. Fetch the "Cloud State"
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;
  const allS3Objects: _Object[] = [];

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      allS3Objects.push(...response.Contents);
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  console.log(`Found ${allS3Objects.length} total objects in the S3 bucket.`);

  // 3. The Diffing Engine
  const orphans: _Object[] = [];
  let totalOrphanSize = 0;

  for (const obj of allS3Objects) {
    if (!obj.Key) continue;

    if (isSystemFile(obj.Key)) continue;

    if (!validKeys.has(obj.Key)) {
      orphans.push(obj);
      totalOrphanSize += obj.Size || 0;
    }
  }

  console.log('\n--- Cleanup Summary ---');
  console.log(`Orphaned Files Found: ${orphans.length}`);
  console.log(`Total Wasted Space: ${formatBytes(totalOrphanSize)}`);

  if (orphans.length > 0) {
    console.log('\nSample of orphaned keys (first 20):');
    const sample = orphans.slice(0, 20);
    sample.forEach(o => console.log(`  - ${o.Key}`));
  }

  if (!isConfirm) {
    console.log('\n\x1b[33m%s\x1b[0m', 'DRY RUN MODE ENABLED. Stopping before deletion.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // 4. Execution
  console.log('\nStarting deletion sequence...');
  let deletedCount = 0;

  for (const orphan of orphans) {
    if (!orphan.Key) continue;

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: orphan.Key,
      });

      await s3Client.send(deleteCommand);
      deletedCount++;
      console.log(`[DELETED] ${orphan.Key}`);
    } catch (err) {
      console.error(`[ERROR] Failed to delete ${orphan.Key}:`, err);
    }

    // Throttle to prevent EAI_AGAIN rate limits
    await delay(100);
  }

  console.log(`\nSuccessfully deleted ${deletedCount}/${orphans.length} orphaned files.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal error during cloud cleanup:', e);
  prisma.$disconnect();
  process.exit(1);
});
