import { NextResponse } from 'next/server';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        error: 'Missing R2 credentials',
        hasAccountId: !!accountId,
        hasAccessKeyId: !!accessKeyId,
        hasSecretAccessKey: !!secretAccessKey,
        hasBucketName: !!bucketName,
      }, { status: 500 });
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Try to list buckets to test connection
    await client.send(new ListBucketsCommand({}));

    return NextResponse.json({
      success: true,
      message: 'R2 connection successful!',
      accountId,
      bucketName,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'R2 connection failed',
      message: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
}
