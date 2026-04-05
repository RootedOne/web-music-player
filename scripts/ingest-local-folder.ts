import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { parseFile } from 'music-metadata';
import * as ffmpeg from 'fluent-ffmpeg';
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
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `${ENDPOINT}/${BUCKET_NAME}/${key}`;
}

async function convertToFlac(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('flac')
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(outputPath);
  });
}

function getAudioFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAudioFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp3', '.wav', '.flac', '.m4a'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('--- Bulk Ingestion Tool ---');

  if (!BUCKET_NAME || !ENDPOINT) {
    console.error('Missing S3_BUCKET_NAME or S3_ENDPOINT in environment variables.');
    process.exit(1);
  }

  // 1. Resolve Admin User Context
  let adminUser = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME },
  });

  if (!adminUser) {
    console.warn(`Admin user '${ADMIN_USERNAME}' not found. Falling back to the first available user...`);
    adminUser = await prisma.user.findFirst();
  }

  if (!adminUser) {
    console.error('No users found in the database. Please create a user before running ingestion.');
    process.exit(1);
  }

  console.log(`Ingesting tracks on behalf of User ID: ${adminUser.id} (${adminUser.username})`);

  rl.question('\nEnter the absolute path to the local music folder: ', async (folderPath) => {
    rl.close();

    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      console.error(`Invalid directory path: ${folderPath}`);
      process.exit(1);
    }

    const files = getAudioFiles(folderPath);
    console.log(`Found ${files.length} audio files to process.`);

    for (let index = 0; index < files.length; index++) {
      const filePath = files[index];
      console.log(`\nProcessing ${index + 1}/${files.length}: ${path.basename(filePath)}`);

      try {
        // 2. Extract Metadata (BEFORE any conversion)
        const metadata = await parseFile(filePath);
        const title = metadata.common.title || path.parse(filePath).name;
        const artistName = metadata.common.artist || 'Unknown Artist';
        const duration = metadata.format.duration || 0;
        const album = metadata.common.album || null;

        // 3. Database Deduplication & Artist Resolution
        let artist = await prisma.artist.findUnique({
          where: { name: artistName }
        });

        const picture = metadata.common.picture?.[0];

        if (!artist) {
          console.log(`  Creating new Artist: ${artistName}`);
          let artistImageUrl = null;

          if (picture) {
             const ext = picture.format === 'image/png' ? '.png' : '.jpg';
             const key = `covers/artist_bulk_${uuidv4()}${ext}`;
             console.log(`  Uploading artist cover art...`);
             artistImageUrl = await uploadToS3(picture.data, key, picture.format);
          }

          artist = await prisma.artist.create({
            data: {
              name: artistName,
              imageUrl: artistImageUrl
            }
          });
        }

        const existingTrack = await prisma.track.findFirst({
          where: {
            title: title,
            artists: {
              some: { id: artist.id }
            }
          }
        });

        if (existingTrack) {
          console.log(`  Skipping: [${title}] by [${artistName}] already exists in database.`);
          continue;
        }

        // 4. Track Upload & Compression
        const ext = path.extname(filePath).toLowerCase();
        let uploadBuffer: Buffer;
        let finalExt = ext;
        let finalContentType = mime.lookup(ext) || 'application/octet-stream';

        if (ext === '.wav' || ext === '.aiff') {
          console.log(`  Converting lossless ${ext} to FLAC...`);
          const tempPath = path.join(process.cwd(), `temp_${uuidv4()}.flac`);
          await convertToFlac(filePath, tempPath);
          uploadBuffer = fs.readFileSync(tempPath);
          fs.unlinkSync(tempPath);
          finalExt = '.flac';
          finalContentType = 'audio/flac';
        } else {
          uploadBuffer = fs.readFileSync(filePath);
        }

        const audioKey = `tracks/bulk_${uuidv4()}${finalExt}`;
        console.log(`  Uploading audio file to S3...`);
        const fileUrl = await uploadToS3(uploadBuffer, audioKey, finalContentType);

        // 5. Track Cover Upload
        let coverUrl = null;
        if (picture) {
          const coverExt = picture.format === 'image/png' ? '.png' : '.jpg';
          const coverKey = `covers/bulk_${uuidv4()}${coverExt}`;
          console.log(`  Uploading track cover art to S3...`);
          coverUrl = await uploadToS3(picture.data, coverKey, picture.format);
        }

        // 6. Database Insertion
        await prisma.track.create({
          data: {
            title: title,
            artist: artistName, // Legacy string field
            album: album,
            duration: duration,
            fileUrl: fileUrl,
            coverUrl: coverUrl,
            userId: adminUser.id,
            artists: {
              connect: { id: artist.id }
            }
          }
        });

        console.log(`  Success: Inserted [${title}] by [${artistName}]`);

      } catch (err) {
        console.error(`  [ERROR] Failed to process file ${filePath}:`, err);
      }

      // Add artificial delay to prevent rate-limiting or DNS lookup errors
      await delay(500);
    }

    console.log('\nBulk Ingestion completed.');
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error('Fatal error during ingestion:', e);
  prisma.$disconnect();
  process.exit(1);
});
