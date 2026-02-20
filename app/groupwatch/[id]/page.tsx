'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Copy, Check, Send, Edit2 } from 'lucide-react';
import { Episode } from '@/lib/api';
import Pusher from 'pusher-js';
import VideoPlayer from '@/components/VideoPlayer';
import { getVideoUrl } from '@/lib/videoSources';

// Generate a unique room ID
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function GroupWatchPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<number>(1);
  const [syncedTime, setSyncedTime] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<Array<{user: string, message: string, timestamp: number, isSystem?: boolean}>>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [videoUrlState, setVideoUrlState] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const isUpdatingFromRemote = useRef(false);

  const videoUrl = getVideoUrl(id);

  useEffect(() => {
    // Generate username
    const stored = localStorage.getItem('groupwatch_username');
    const user = stored || `User${Math.floor(Math.random() * 1000)}`;
    setUsername(user);
    localStorage.setItem('groupwatch_username', user);

    // Get or create room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let room = urlParams.get('room');
    
    if (!room) {
      room = generateRoomId();
      setIsHost(true);
      window.history.replaceState({}, '', `?room=${room}`);
    }
    
    setRoomId(room);
  }, []);

  // Fetch episode data and final video URL
  useEffect(() => {
    fetch(`/api/episodes`)
      .then(res => res.json())
      .then((episodes: Episode[]) => {
        const ep = episodes.find((e) => e.id === parseInt(id));
        if (ep) setEpisode(ep);
        
        // Use dynamic URL if provided, otherwise fallback to R2
        const finalUrl = (ep && ep.url && (ep.url.includes('.mp4') || ep.url.includes('.m3u8'))) 
          ? ep.url 
          : getVideoUrl(id);
        setVideoUrlState(finalUrl);
      });
  }, [id]);

  useEffect(() => {
    // Initialize Pusher
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || '8f7c0c0e0f4c4e4f4f4f';
    if (!pusherRef.current && roomId && pusherKey) {
      pusherRef.current = new Pusher(pusherKey, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      });

      const channel = pusherRef.current.subscribe(`groupwatch-${roomId}`);
      channelRef.current = channel;

      // Listen for play events
      channel.bind('play', (data: { time: number }) => {
        isUpdatingFromRemote.current = true;
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = data.time;
          video.play();
          setIsPlaying(true);
        }
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 1000);
      });

      // Listen for pause events
      channel.bind('pause', (data: { time: number }) => {
        isUpdatingFromRemote.current = true;
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = data.time;
          video.pause();
          setIsPlaying(false);
        }
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 1000);
      });

      // Listen for seek events
      channel.bind('seek', (data: { time: number }) => {
        isUpdatingFromRemote.current = true;
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = data.time;
          
          // Force Reactivate Subtitles on client sync seek
          if (video.textTracks && video.textTracks.length > 0) {
            const track = video.textTracks[0];
            if (track.mode === 'showing') {
              track.mode = 'hidden';
              setTimeout(() => {
                if (track) track.mode = 'showing';
              }, 50);
            }
          }
        }
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 1000);
      });

      // Listen for chat messages
      channel.bind('chat', (data: { user: string, message: string, timestamp: number, isSystem?: boolean }) => {
        setMessages(prev => [...prev, data]);
      });

      // Listen for participant updates
      channel.bind('join', () => {
        setParticipants(prev => prev + 1);
      });

      // Broadcast join
      broadcastEvent('join', { user: username });
    }

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [id, roomId, username]);

  const broadcastEvent = async (event: string, data: any) => {
    try {
      await fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `groupwatch-${roomId}`,
          event,
          data
        })
      });
    } catch (error) {
      console.error('Failed to broadcast:', error);
    }
  };

  const handleVideoPlay = () => {
    if (!isUpdatingFromRemote.current) {
      const video = document.querySelector('video');
      if (video) {
        broadcastEvent('play', { time: video.currentTime });
        setIsPlaying(true);
      }
    }
  };

  const handleVideoPause = () => {
    if (!isUpdatingFromRemote.current) {
      const video = document.querySelector('video');
      if (video) {
        broadcastEvent('pause', { time: video.currentTime });
        setIsPlaying(false);
      }
    }
  };

  const handleVideoSeek = () => {
    if (!isUpdatingFromRemote.current) {
      const video = document.querySelector('video');
      if (video) {
        broadcastEvent('seek', { time: video.currentTime });
        
        // Fix: Reactivate subtitle mode after a seek. 
        // Some browsers disable or glitch the textTrack mode during rapid cross-origin fetching.
        if (video.textTracks && video.textTracks.length > 0) {
          const track = video.textTracks[0];
          if (track.mode === 'showing') {
            track.mode = 'hidden';
            setTimeout(() => {
              if (track) track.mode = 'showing';
            }, 50);
          }
        }
      }
    }
  };

  const sendMessage = () => {
    if (chatMessage.trim() && roomId) {
      const msg = {
        user: username,
        message: chatMessage.trim(),
        timestamp: Date.now()
      };
      broadcastEvent('chat', msg);
      setMessages(prev => [...prev, msg]);
      setChatMessage('');
    }
  };

  const startEditingUsername = () => {
    setTempUsername(username);
    setIsEditingUsername(true);
  };

  const saveUsername = () => {
    if (tempUsername.trim() && tempUsername !== username) {
      const oldName = username;
      const newName = tempUsername.trim();
      
      // Send system message about name change
      const systemMsg = {
        user: 'System',
        message: `${oldName} changed their name to ${newName}`,
        timestamp: Date.now(),
        isSystem: true
      };
      broadcastEvent('chat', systemMsg);
      setMessages(prev => [...prev, systemMsg]);
      
      // Update username
      setUsername(newName);
      localStorage.setItem('groupwatch_username', newName);
    }
    setIsEditingUsername(false);
  };

  const cancelEditingUsername = () => {
    setIsEditingUsername(false);
    setTempUsername('');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/groupwatch/${id}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Attach video event listeners
  useEffect(() => {
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('play', handleVideoPlay);
      video.addEventListener('pause', handleVideoPause);
      video.addEventListener('seeked', handleVideoSeek);

      return () => {
        video.removeEventListener('play', handleVideoPlay);
        video.removeEventListener('pause', handleVideoPause);
        video.removeEventListener('seeked', handleVideoSeek);
      };
    }
  }, [roomId]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="relative bg-black/90 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            href={`/watch/${id}`}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit GroupWatch
          </Link>

          {episode && (
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-white">
                {episode.name}
              </h1>
              <p className="text-xs text-gray-400">{episode.episode}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Episode Selector */}
            <select
              value={id}
              onChange={(e) => {
                const newEpisode = e.target.value;
                window.location.href = `/groupwatch/${newEpisode}?room=${roomId}`;
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white font-medium cursor-pointer transition-all focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="" disabled className="bg-zinc-900">Select Episode</option>
              {Array.from({ length: 81 }, (_, i) => i + 1).map(epNum => (
                <option key={epNum} value={epNum} className="bg-zinc-900">
                  Episode {epNum}
                </option>
              ))}
            </select>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-medium text-white">{participants}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player - Takes up 3 columns */}
          <div className="lg:col-span-3">
            <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-white/10 relative shadow-2xl">
              <VideoPlayer
                src={videoUrlState || videoUrl}
                episodeId={id}
                autoPlay={false}
                showCCButton={true}
                enableSubtitles={true}
                onTimeUpdate={(time) => {
                  setSyncedTime(time);
                }}
              />
            </div>

            {/* GroupWatch Info */}
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Share this GroupWatch</h3>
                  <p className="text-xs text-gray-400">
                    {isHost ? "You're the host. Share this link to invite friends!" : "You've joined a GroupWatch session"}
                  </p>
                </div>
                <button
                  onClick={copyRoomLink}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded-lg font-medium text-white transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <div className="mt-3 p-2 bg-black/30 rounded text-xs text-gray-400 font-mono break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/groupwatch/${id}?room=${roomId}` : ''}
              </div>
            </div>

            {/* Status Info */}
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-200">
                <strong>✨ Live:</strong> Video playback is synced in real-time! Play, pause, and seek actions are shared with all participants.
              </p>
            </div>

            {/* Subtitle Support */}
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>💬 Subs Enabled:</strong> Subtitles are now synced! Use the <strong>CC</strong> button in the player to toggle them.
              </p>
            </div>

            {/* Next Episode Button */}
            {parseInt(id) < 81 && (
              <div className="mt-4">
                <Link
                  href={`/groupwatch/${parseInt(id) + 1}?room=${roomId}`}
                  className="block w-full px-4 py-3 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded-lg font-bold text-white text-center transition-all"
                >
                  Next Episode →
                </Link>
              </div>
            )}
          </div>

          {/* Chat/Participants Sidebar - Takes up 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 h-full flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--accent)]" />
                Participants ({participants})
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {username.substring(0, 2).toUpperCase()}
                  </div>
                  {isEditingUsername ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveUsername();
                          if (e.key === 'Escape') cancelEditingUsername();
                        }}
                        className="flex-1 bg-black/30 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Enter nickname"
                        autoFocus
                        maxLength={20}
                      />
                      <button
                        onClick={saveUsername}
                        className="text-green-400 hover:text-green-300 p-1"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-white">
                        {username} {isHost && '(Host)'}
                      </p>
                      <button
                        onClick={startEditingUsername}
                        className="text-gray-400 hover:text-white p-1"
                        title="Edit nickname"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {participants > 1 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    + {participants - 1} other{participants === 2 ? '' : 's'}
                  </div>
                )}
              </div>

              {/* Chat Section */}
              <div className="border-t border-white/10 pt-4 flex-1 flex flex-col">
                <h4 className="text-sm font-bold text-white mb-3">Chat</h4>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
                  {messages.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No messages yet. Say hi! 👋
                    </p>
                  ) : (
                    messages.map((msg, i) => (
                      msg.isSystem ? (
                        <div key={i} className="text-center py-1">
                          <p className="text-xs text-gray-500 italic">{msg.message}</p>
                        </div>
                      ) : (
                        <div key={i} className="bg-white/5 rounded p-2">
                          <p className="text-xs font-medium text-[var(--accent)]">{msg.user}</p>
                          <p className="text-sm text-white mt-0.5">{msg.message}</p>
                        </div>
                      )
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={sendMessage}
                    className="p-2 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
