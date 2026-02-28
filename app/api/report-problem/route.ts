import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { episodeId, episodeName, episodeCode, problemType, description } = body;

    // Format Discord embed message
    const discordWebhook = process.env.DISCORD_WEBHOOK || 'https://discord.com/api/webhooks/1443720862783111330/RmzMWIaD_aGuFEceLUfbTy487HAmqkee5EhtJ6Ilx76IPX2t9JS_qDwSC3YillgTIZQV';
    
    const discordMessage = {
      embeds: [{
        title: '🚨 RickFlix Problem Report',
        color: 0x00ADB5, // Cyan color
        fields: [
          {
            name: '📺 Episode',
            value: `${episodeId} - ${episodeName} (${episodeCode})`,
            inline: false
          },
          {
            name: '⚠️ Problem Type',
            value: problemType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            inline: false
          },
          {
            name: '📝 Description',
            value: description,
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'RickFlix Streaming Site'
        }
      }]
    };

    // Send to Discord
    const response = await fetch(discordWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      console.error('Discord webhook error:', await response.text());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}
