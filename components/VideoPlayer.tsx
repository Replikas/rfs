'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  episodeId: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  autoPlay?: boolean;
}

// Detect if user is on iPhone/Safari
function isSafariOrIOS() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const safari = /^((?!chrome|android).)*safari/i.test(ua);
  return iOS || safari;
}

export default function VideoPlayer({ 
  src, 
  episodeId,
  onEnded, 
  onTimeUpdate, 
  onError,
  autoPlay = true 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [useHLS, setUseHLS] = useState(false);

  const TRANSCODER_URL = process.env.NEXT_PUBLIC_TRANSCODER_URL || 'http://localhost:3001';

  useEffect(() => {
    // Check if we should use HLS (for Safari/iOS)
    setUseHLS(isSafariOrIOS());
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = `${TRANSCODER_URL}/hls/${episodeId}/master.m3u8`;

    if (useHLS) {
      // iOS/Safari - Use native HLS support
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS for Safari/iOS');
        video.src = hlsUrl;
      }
      // Other browsers - Use hls.js
      else if (Hls.isSupported()) {
        console.log('Using hls.js');
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            if (onError) onError();
          }
        });

        hlsRef.current = hls;
      }
    } else {
      // Desktop - Use direct MP4
      console.log('Using direct MP4');
      video.src = src;
    }

    // Event listeners
    const handleEnded = () => {
      if (onEnded) onEnded();
    };

    const handleTimeUpdate = () => {
      if (onTimeUpdate && video.duration) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    const handleError = () => {
      if (onError) onError();
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, episodeId, useHLS, autoPlay, onEnded, onTimeUpdate, onError, TRANSCODER_URL]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay={autoPlay}
      playsInline
      className="w-full h-full bg-black"
      controlsList="nodownload"
    />
  );
}
