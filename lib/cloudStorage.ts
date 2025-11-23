import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

// Storage clients
let r2Client: S3Client | null = null;
let googleStorage: Storage | null = null;

// Initialize Cloudflare R2 (preferred)
function getR2Client() {
  if (!r2Client) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return null;
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

// Initialize Google Cloud Storage (fallback)
function getGoogleStorage() {
  if (!googleStorage) {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

    if (!credentials || !bucketName) {
      return null;
    }

    try {
      const credentialsJson = JSON.parse(credentials);
      googleStorage = new Storage({
        credentials: credentialsJson,
        projectId: credentialsJson.project_id,
      });
    } catch (error) {
      console.error('Failed to initialize Google Cloud Storage:', error);
      return null;
    }
  }
  return googleStorage;
}

export async function uploadToCloud(
  file: Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  // Try Cloudflare R2 first (cheapest, no egress fees!)
  const r2 = getR2Client();
  if (r2) {
    return uploadToR2(r2, file, fileName, contentType);
  }

  // Fall back to Google Cloud Storage
  const google = getGoogleStorage();
  if (google) {
    return uploadToGoogleCloud(google, file, fileName, contentType);
  }

  throw new Error('No cloud storage configured');
}

async function uploadToR2(
  client: S3Client,
  file: Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

  if (!bucketName) {
    throw new Error('R2 bucket name not configured');
  }

  const key = `videos/${fileName}`;
  
  // Detect content type from file extension if not provided
  let finalContentType = contentType;
  if (!finalContentType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'mkv') finalContentType = 'video/x-matroska';
    else if (ext === 'mp4') finalContentType = 'video/mp4';
    else if (ext === 'webm') finalContentType = 'video/webm';
    else finalContentType = 'video/mp4';
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: finalContentType,
    })
  );

  // Return public URL (using custom domain if configured, otherwise R2.dev domain)
  if (publicDomain) {
    return `https://${publicDomain}/${key}`;
  }
  
  // Use the R2 public dev URL from environment variable, fallback to account-based URL
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`;
  return `${publicUrl}/${key}`;
}

async function uploadToGoogleCloud(
  storage: Storage,
  file: Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('Google Cloud bucket name not configured');
  }

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`videos/${fileName}`);
  
  // Detect content type from file extension if not provided
  let finalContentType = contentType;
  if (!finalContentType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'mkv') finalContentType = 'video/x-matroska';
    else if (ext === 'mp4') finalContentType = 'video/mp4';
    else if (ext === 'webm') finalContentType = 'video/webm';
    else finalContentType = 'video/mp4';
  }

  await blob.save(file, {
    metadata: {
      contentType: finalContentType,
    },
  });

  await blob.makePublic();

  return `https://storage.googleapis.com/${bucketName}/videos/${fileName}`;
}

export function isCloudStorageConfigured(): boolean {
  // Check R2 first
  const hasR2 = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );

  // Check Google Cloud as fallback
  const hasGoogle = !!(
    process.env.GOOGLE_CLOUD_CREDENTIALS &&
    process.env.GOOGLE_CLOUD_BUCKET_NAME
  );

  return hasR2 || hasGoogle;
}

export function getStorageProvider(): 'r2' | 'google' | 'none' {
  if (getR2Client()) return 'r2';
  if (getGoogleStorage()) return 'google';
  return 'none';
}
