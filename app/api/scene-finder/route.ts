import { NextRequest, NextResponse } from 'next/server';

import { getAllEpisodes } from '@/lib/api';
import { searchScenes } from '@/lib/sceneFinder';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!query) {
    return NextResponse.json({ query, results: [] });
  }

  const episodes = await getAllEpisodes();
  const results = await searchScenes(query, episodes);

  return NextResponse.json({ query, count: results.length, results });
}
