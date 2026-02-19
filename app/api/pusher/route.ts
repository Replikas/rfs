import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// Initialize Pusher - using free tier credentials
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '1919445',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '8f7c0c0e0f4c4e4f4f4f',
  secret: process.env.PUSHER_SECRET || 'demo-secret-key',
  cluster: process.env.PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, event, data } = body;

    // Check if Pusher is properly configured
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET) {
      console.warn('⚠️ Pusher not configured - GroupWatch sync disabled');
      // Return success to avoid breaking the UI, but sync won't work
      return NextResponse.json({ success: true, warning: 'Sync disabled - Pusher not configured' });
    }

    // Trigger the event
    await pusher.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    // Return 200 to avoid breaking the UI
    return NextResponse.json({ success: false, error: 'Sync temporarily unavailable' }, { status: 200 });
  }
}
