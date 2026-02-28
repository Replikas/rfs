import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Prefix: 'videos/',
    });

    const response = await S3.send(command);
    const files = response.Contents || [];

    // Extract episode IDs from filenames
    const episodes = files.map(file => {
      const match = file.Key?.match(/episode-(\d+)\.(mp4|mkv|webm)/);
      return {
        key: file.Key,
        size: file.Size,
        episodeId: match ? parseInt(match[1]) : null,
        extension: match ? match[2] : null,
        lastModified: file.LastModified,
      };
    }).filter(f => f.episodeId !== null);

    // Sort by episode ID
    episodes.sort((a, b) => (a.episodeId || 0) - (b.episodeId || 0));

    return NextResponse.json({
      total: episodes.length,
      episodes,
      allFiles: files.map(f => f.Key),
    });
  } catch (error: any) {
    console.error('List failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list videos' },
      { status: 500 }
    );
  }
}
