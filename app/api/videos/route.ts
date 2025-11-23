import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const videosDir = join(process.cwd(), 'public', 'videos');
    
    if (!existsSync(videosDir)) {
      return NextResponse.json({ videos: [] });
    }

    const files = await readdir(videosDir);
    const videoFiles = files.filter(file => 
      file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')
    );

    return NextResponse.json({ videos: videoFiles });
  } catch (error) {
    console.error('Error reading videos:', error);
    return NextResponse.json({ videos: [] });
  }
}
