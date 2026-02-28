import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: NextRequest) {
  try {
    const { fileName, episodeId } = await request.json();

    if (!fileName || !episodeId) {
      return NextResponse.json(
        { error: 'fileName and episodeId are required' },
        { status: 400 }
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json(
        { error: 'R2 configuration missing' },
        { status: 500 }
      );
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Get file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const key = `videos/episode-${episodeId}.${fileExtension}`;

    // Detect content type
    let contentType = 'video/mp4';
    if (fileExtension === 'mkv') contentType = 'video/x-matroska';
    else if (fileExtension === 'webm') contentType = 'video/webm';
    else if (fileExtension === 'mov') contentType = 'video/quicktime';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL valid for 1 hour
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    // Generate public URL
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev';
    const publicUrl = `${r2PublicUrl}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    console.error('Presigned URL generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: error.message },
      { status: 500 }
    );
  }
}
