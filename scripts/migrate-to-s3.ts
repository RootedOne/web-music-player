import * as dotenv from 'dotenv';
dotenv.config(); // Load the .env file

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const getContentType = (filePath: string) => {
  return mime.lookup(filePath) || 'application/octet-stream';
};

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

const bucketName = process.env.S3_BUCKET_NAME;
const s3Endpoint = process.env.S3_ENDPOINT;

if (!bucketName || !s3Endpoint) {
  console.error("Missing S3_BUCKET_NAME or S3_ENDPOINT environment variables.");
  process.exit(1);
}

const isLocalPath = (url: string | null) => {
  if (!url) return false;
  return url.startsWith('/uploads/') && !url.startsWith('http');
};

const getLocalFilePath = (url: string) => {
  // Try public/uploads first
  const publicPath = path.join(process.cwd(), 'public', url);
  if (fs.existsSync(publicPath)) return publicPath;

  // Try root/uploads just in case it was stored there previously
  const rootPath = path.join(process.cwd(), url);
  if (fs.existsSync(rootPath)) return rootPath;

  return null;
};

const uploadToS3 = async (filePath: string, key: string) => {
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${s3Endpoint}/${bucketName}/${key}`;
};

const compressAudio = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

async function main() {
  console.log("Starting S3 Migration Script...");

  try {
    // 1. Tracks (Audio + Covers)
    const tracks = await prisma.track.findMany();
    let trackCount = 0;

    for (const track of tracks) {
      let updatedFileUrl = track.fileUrl;
      let updatedCoverUrl = track.coverUrl;
      let needsUpdate = false;

      // Audio File
      if (isLocalPath(track.fileUrl)) {
        const localFile = getLocalFilePath(track.fileUrl);
        if (localFile) {
          const fileUuid = uuidv4();
          const tmpFilePath = path.join(process.cwd(), 'public', 'uploads', `tmp_${fileUuid}.mp3`);

          try {
            console.log(`Compressing ${localFile}...`);
            await compressAudio(localFile, tmpFilePath);

            const key = `tracks/${fileUuid}.mp3`;
            updatedFileUrl = await uploadToS3(tmpFilePath, key);
            needsUpdate = true;
          } catch (err: any) {
             console.error(`Failed to compress/upload track file ${localFile}:`, err.message);
          } finally {
            if (fs.existsSync(tmpFilePath)) {
               fs.unlinkSync(tmpFilePath);
            }
          }
        } else {
          console.warn(`Local file missing for track ID ${track.id} (${track.fileUrl})`);
        }
      }

      // Cover File
      if (isLocalPath(track.coverUrl)) {
        const localCover = getLocalFilePath(track.coverUrl as string);
        if (localCover) {
          try {
            const ext = path.extname(localCover) || '.jpg';
            const key = `covers/legacy_${uuidv4()}${ext}`;
            updatedCoverUrl = await uploadToS3(localCover, key);
            needsUpdate = true;
          } catch (err: any) {
            console.error(`Failed to upload track cover ${localCover}:`, err.message);
          }
        } else {
          console.warn(`Local cover missing for track ID ${track.id} (${track.coverUrl})`);
        }
      }

      if (needsUpdate) {
        await prisma.track.update({
          where: { id: track.id },
          data: { fileUrl: updatedFileUrl, coverUrl: updatedCoverUrl },
        });
        trackCount++;
        console.log(`Migrated track ${trackCount}: [${track.title}]`);
      }
    }

    // 2. Playlists (Covers)
    const playlists = await prisma.playlist.findMany();
    let playlistCount = 0;

    for (const playlist of playlists) {
      if (isLocalPath(playlist.coverUrl)) {
        const localCover = getLocalFilePath(playlist.coverUrl as string);
        if (localCover) {
          try {
            const ext = path.extname(localCover) || '.jpg';
            const key = `covers/legacy_playlist_${uuidv4()}${ext}`;
            const updatedCoverUrl = await uploadToS3(localCover, key);

            await prisma.playlist.update({
              where: { id: playlist.id },
              data: { coverUrl: updatedCoverUrl }
            });

            playlistCount++;
            console.log(`Migrated playlist ${playlistCount}: [${playlist.name}]`);
          } catch (err: any) {
             console.error(`Failed to upload playlist cover ${localCover}:`, err.message);
          }
        } else {
          console.warn(`Local cover missing for playlist ID ${playlist.id} (${playlist.coverUrl})`);
        }
      }
    }

    // 3. Artists (Covers)
    const artists = await prisma.artist.findMany();
    let artistCount = 0;

    for (const artist of artists) {
      if (isLocalPath(artist.imageUrl)) {
        const localImage = getLocalFilePath(artist.imageUrl as string);
        if (localImage) {
          try {
            const ext = path.extname(localImage) || '.jpg';
            const key = `covers/legacy_artist_${uuidv4()}${ext}`;
            const updatedImageUrl = await uploadToS3(localImage, key);

            await prisma.artist.update({
               where: { id: artist.id },
               data: { imageUrl: updatedImageUrl }
            });

            artistCount++;
            console.log(`Migrated artist ${artistCount}: [${artist.name}]`);
          } catch (err: any) {
             console.error(`Failed to upload artist cover ${localImage}:`, err.message);
          }
        } else {
           console.warn(`Local image missing for artist ID ${artist.id} (${artist.imageUrl})`);
        }
      }
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`Migrated Tracks: ${trackCount}`);
    console.log(`Migrated Playlists: ${playlistCount}`);
    console.log(`Migrated Artists: ${artistCount}`);

  } catch (error) {
    console.error("A fatal error occurred during migration:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();