import { NextRequest } from 'next/server';
const { Storage } = require('megajs');

// Mega credentials
const ACCOUNTS = [
  {
    email: 'bbbreplika@gmail.com',
    password: 'Hotantenoci87.',
    episodes: Array.from({ length: 40 }, (_, i) => i + 1), // 1-40
  },
  {
    email: 'yoisan829@gmail.com',
    password: 'Hotantenoci87.',
    episodes: [...Array.from({ length: 25 }, (_, i) => i + 41), ...Array.from({ length: 10 }, (_, i) => i + 72)], // 41-65, 72-81
  },
  {
    email: 'reolicaof@gmail.com',
    password: 'Hotantenoci87.',
    episodes: Array.from({ length: 6 }, (_, i) => i + 66), // 66-71
  },
];

// Cache Mega sessions (in-memory, resets on server restart)
const sessionCache = new Map<string, { storage: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - longer cache

// Cache file references to avoid re-finding files
const fileCache = new Map<string, { file: any; timestamp: number }>();
const FILE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function loginToMega(email: string, password: string) {
  // Check cache first
  const cached = sessionCache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached Mega session for', email);
    return cached.storage;
  }
  
  console.log('Creating new Mega session for', email);
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => {
      // Cache the session
      sessionCache.set(email, { storage, timestamp: Date.now() });
      resolve(storage);
    });
    storage.once('error', (error: Error) => reject(error));
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const episodeId = parseInt(id);
  
  if (isNaN(episodeId) || episodeId < 1 || episodeId > 81) {
    return new Response('Invalid episode ID', { status: 400 });
  }
  
  try {
    // Determine which account to use
    const account = ACCOUNTS.find(acc => acc.episodes.includes(episodeId));
    if (!account) {
      return new Response('Episode not found', { status: 404 });
    }
    
    // Check file cache first
    const cacheKey = `${account.email}-${episodeId}`;
    const cachedFile = fileCache.get(cacheKey);
    
    let episodeFile;
    
    if (cachedFile && Date.now() - cachedFile.timestamp < FILE_CACHE_DURATION) {
      console.log('Using cached file reference for episode', episodeId);
      episodeFile = cachedFile.file;
    } else {
      // Login to Mega
      const storage: any = await loginToMega(account.email, account.password);
      
      // Find the episode file
      const files = storage.root.children;
      episodeFile = files.find((f: any) => 
        f.name && f.name.startsWith(`Episode ${episodeId} `)
      );
      
      if (!episodeFile) {
        return new Response('Episode file not found', { status: 404 });
      }
      
      // Cache the file reference
      fileCache.set(cacheKey, { file: episodeFile, timestamp: Date.now() });
    }
    
    // Support for range requests (required for video seeking)
    const range = request.headers.get('range');
    const fileSize = episodeFile.size;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // Stream from Mega with range - optimized for speed
      const stream = episodeFile.download({ 
        start, 
        end,
        maxConnections: 8, // Increase parallel connections
        initialChunkSize: 256 * 1024, // 256KB initial chunks
        maxChunkSize: 1024 * 1024 // 1MB max chunks
      });
      
      // Convert Node.js stream to Web ReadableStream
      const { Readable } = await import('stream');
      const webStream = Readable.toWeb(stream as any);
      
      return new Response(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    } else {
      // Full file stream - optimized for speed
      const stream = episodeFile.download({
        maxConnections: 8, // Increase parallel connections
        initialChunkSize: 256 * 1024, // 256KB initial chunks
        maxChunkSize: 1024 * 1024 // 1MB max chunks
      });
      
      // Convert Node.js stream to Web ReadableStream
      const { Readable } = await import('stream');
      const webStream = Readable.toWeb(stream as any);
      
      return new Response(webStream as any, {
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        },
      });
    }
    
  } catch (error: any) {
    console.error('Mega streaming error:', error);
    return new Response(error.message || 'Failed to stream video', { status: 500 });
  }
}
