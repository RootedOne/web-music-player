import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'us-east-1', // Hardcoded as per nuclear option
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for Parspack / S3 compatible with hashing
});

/**
 * Generate a presigned URL for uploading a file to S3.
 * CRITICAL: We do NOT include ContentType here to avoid Parspack 403 SignatureDoesNotMatch errors.
 */
export async function generatePresignedUrl(key: string) {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    // ContentType omitted on purpose
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  // Construct the final public URL to be returned alongside the presigned URL
  const publicUrl = `${process.env.S3_ENDPOINT}/${bucket}/${key}`;

  return { presignedUrl: url, publicUrl };
}

/**
 * Delete a file from S3 using the DeleteObjectCommand wrapped in a try/catch.
 */
export async function deleteS3File(key: string) {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete S3 file with key ${key}:`, error);
  }
}
