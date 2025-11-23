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
    return NextResponse.json({ backdrop });
  } catch (error) {
    return NextResponse.json(
      { backdrop: 'https://images4.alphacoders.com/131/1313607.png' },
      { status: 200 }
    );
  }
}
