import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync } from 'fs';
import { uploadToCloud, isCloudStorageConfigured } from '@/lib/cloudStorage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const episodeId = formData.get('episodeId') as string;

    if (!file || !episodeId) {
      return NextResponse.json(
        { error: 'File and episode ID are required' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Get file extension from original file
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const filename = `episode-${episodeId}.${fileExtension}`;
    let videoUrl: string;
    let storageType: string;

    // Try cloud storage first, fallback to local
    if (isCloudStorageConfigured()) {
      try {
        videoUrl = await uploadToCloud(buffer, filename, file.type || `video/${fileExtension}`);
        storageType = 'cloud';
        console.log('✅ Uploaded to R2/Cloud Storage:', videoUrl);
      } catch (cloudError: any) {
        console.error('❌ Cloud upload failed:', cloudError);
        return NextResponse.json(
          { 
            error: 'Cloud storage upload failed',
            details: cloudError.message || cloudError.toString(),
            suggestion: 'Check R2 bucket permissions and API token'
          },
          { status: 500 }
        );
      }
    } else {
      videoUrl = await uploadLocally(buffer, filename);
      storageType = 'local';
    }

    // Update video sources file
    const videoSourcesPath = join(process.cwd(), 'lib', 'videoSources.ts');
    const fs = require('fs');
    let content = fs.readFileSync(videoSourcesPath, 'utf8');
    
    const newEntry = `  "${episodeId}": "${videoUrl}",`;
    
    if (content.includes('export const videoSources: Record<string, string> = {')) {
      content = content.replace(
        /export const videoSources: Record<string, string> = \{/,
        `export const videoSources: Record<string, string> = {\n${newEntry}`
      );
      fs.writeFileSync(videoSourcesPath, content);
    }

    return NextResponse.json({
      success: true,
      message: `Video uploaded successfully to ${storageType} storage`,
      filename,
      url: videoUrl,
      storageType,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

async function uploadLocally(buffer: Buffer, filename: string): Promise<string> {
  const videosDir = join(process.cwd(), 'public', 'videos');
  if (!existsSync(videosDir)) {
    await mkdir(videosDir, { recursive: true });
  }
  
  const filepath = join(videosDir, filename);
  await writeFile(filepath, buffer);
  
  return `/videos/${filename}`;
}
