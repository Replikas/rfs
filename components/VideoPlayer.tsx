'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  episodeId?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({ 
  src, 
  onEnded, 
  onTimeUpdate, 
  onError,
  autoPlay = true 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
      console.error('Video playback error');
      if (onError) onError();
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
    };
  }, [onEnded, onTimeUpdate, onError]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      autoPlay={autoPlay}
      playsInline
      preload="metadata"
      className="w-full h-full bg-black"
      controlsList="nodownload"
    />
  );
}
