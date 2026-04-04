import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "",
  region: "us-east-1", // Generally "us-east-1" is required for S3-compatible storage if not specified
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Needed for custom S3 endpoints
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

/**
 * Generates a presigned URL for uploading a file to S3.
 * @param key The unique key (filename) for the file.
 * @param contentType The MIME type of the file.
 * @returns The presigned URL and the final public URL.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPresignedUploadUrl(key: string, _contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ACL: "public-read",
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const endpointUrl = process.env.S3_ENDPOINT || "";
  const publicUrl = `${endpointUrl.replace(/\/$/, "")}/${BUCKET_NAME}/${key}`;

  return { presignedUrl, publicUrl };
}

/**
 * Deletes a file from S3 given its public URL or key.
 * @param fileUrlOrKey The public URL or the object key.
 */
export async function deleteS3File(fileUrlOrKey: string) {
  if (!fileUrlOrKey) return;

  // Extract the key if a full URL was provided
  let key = fileUrlOrKey;
  const endpointPrefix = `${(process.env.S3_ENDPOINT || "").replace(/\/$/, "")}/${BUCKET_NAME}/`;

  if (fileUrlOrKey.startsWith(endpointPrefix)) {
    key = fileUrlOrKey.substring(endpointPrefix.length);
  } else if (fileUrlOrKey.startsWith(`/${BUCKET_NAME}/`)) {
    key = fileUrlOrKey.substring(`/${BUCKET_NAME}/`.length);
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete S3 object (key: ${key}):`, error);
  }
}
