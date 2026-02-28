'use client';

import { useEffect, useRef, useState } from 'react';
import { saveWatchProgress, getWatchProgress } from '@/lib/watchProgress';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  episodeId?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  autoPlay?: boolean;
  resumeTime?: number | null;
  enableSubtitles?: boolean;
  showCCButton?: boolean;
}

export default function VideoPlayer({ 
  src,
  episodeId,
  onEnded, 
  onTimeUpdate, 
  onError,
  autoPlay = true,
  resumeTime = null,
  enableSubtitles = false,
  showCCButton = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(enableSubtitles);
  const [hasResumed, setHasResumed] = useState(false);
  
  // Generate subtitle URL
  const subtitleUrl = episodeId 
    ? `/subtitles/episode-${episodeId}-en.vtt`
    : null;

  // Initialize Video / HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (src.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          capLevelToPlayerSize: true,
          autoStartLoad: true
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data.type);
            if (onError) onError();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
      }
    } else {
      // Normal MP4
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src, autoPlay, onError]);
  
  // Sync enableSubtitles prop with state
  useEffect(() => {
    if (enableSubtitles) {
      setSubtitlesEnabled(true);
      const video = videoRef.current;
      if (video && video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
      }
    }
  }, [enableSubtitles]);

  // Resume from saved time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasResumed) return;
    
    if (resumeTime === null || resumeTime <= 10) return;
    
    const handleLoadedMetadata = () => {
      video.currentTime = resumeTime;
      setHasResumed(true);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [resumeTime, hasResumed, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Default subtitle mode
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = enableSubtitles ? 'showing' : 'disabled';
      }
    }

    // Event listeners
    const handleEnded = () => { if (onEnded) onEnded(); };
    const handleTimeUpdate = () => {
      if (onTimeUpdate && video.duration) {
        onTimeUpdate(video.currentTime, video.duration);
      }
      if (episodeId && video.duration > 0 && Math.floor(video.currentTime) % 5 === 0) {
        saveWatchProgress({
          episodeId: parseInt(episodeId),
          currentTime: video.currentTime,
          duration: video.duration,
          lastWatched: Date.now(),
          completed: video.currentTime / video.duration > 0.95
        });
      }
    };
    const handleError = () => { if (onError) onError(); };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
    };
  }, [onEnded, onTimeUpdate, onError, episodeId, enableSubtitles]);

  const toggleSubtitles = () => {
    const video = videoRef.current;
    if (!video || !video.textTracks || video.textTracks.length === 0) return;

    const newState = !subtitlesEnabled;
    setSubtitlesEnabled(newState);
    
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = newState ? 'showing' : 'disabled';
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className="w-full h-full bg-black relative"
        controlsList="nodownload"
        crossOrigin="anonymous"
      >
        {subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang="en"
            label="English"
            default={enableSubtitles}
          />
        )}
      </video>
      
      {subtitleUrl && showCCButton && (
        <button
          onClick={toggleSubtitles}
          className={`absolute bottom-4 right-4 px-2 py-1 rounded text-[10px] font-bold transition-all z-50 ${
            subtitlesEnabled 
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
              : 'bg-black/70 text-white hover:bg-black/90'
          }`}
        >
          CC
        </button>
      )}
    </div>
  );
}
