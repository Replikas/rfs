import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeBackdrop } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const episodeCode = searchParams.get('code');

  if (!episodeCode) {
    return NextResponse.json(
      { error: 'Episode code is required' },
      { status: 400 }
    );
  }

  try {
    const backdrop = await getEpisodeBackdrop(episodeCode);
    
    // Check if it's Season 9 and we got the default fallback
    const isSeason9 = episodeCode.startsWith('S09');
    const isDefaultFallback = backdrop === 'https://images4.alphacoders.com/131/1313607.png';
    
    if (isSeason9 && isDefaultFallback) {
      // Use the provided "Coming Soon" style backdrop for Season 9 placeholders
      return NextResponse.json({ 
        backdrop: '/s9-placeholder.png', 
        isPlaceholder: true 
      });
    }

    return NextResponse.json({ backdrop });
  } catch (error) {
    return NextResponse.json(
      { backdrop: 'https://images4.alphacoders.com/131/1313607.png' },
      { status: 200 }
    );
  }
}
