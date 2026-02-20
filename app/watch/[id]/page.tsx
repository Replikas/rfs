'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, SkipForward } from 'lucide-react';
import { Episode } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import { getVideoUrl } from '@/lib/videoSources';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [videoLoading, setVideoLoading] = useState(true);
  const [backdrop, setBackdrop] = useState<string>('');
  const [showNextPreview, setShowNextPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  // Use dynamic URL if provided, otherwise fallback to R2
  const finalVideoUrl = (episode && episode.url && (episode.url.includes('.mp4') || episode.url.includes('.m3u8'))) 
    ? episode.url 
    : getVideoUrl(id);

  const nextEpisodeId = parseInt(id) < 81 ? parseInt(id) + 1 : null;

  // Reset video loading when episode changes
  useEffect(() => {
    setVideoLoading(true);
  }, [id]);

  useEffect(() => {
    fetch(`/api/episodes`)
      .then(res => res.json())
      .then(episodes => {
        const ep = episodes.find((e: Episode) => e.id === parseInt(id));
        setEpisode(ep);
        
        // Fetch backdrop
        if (ep) {
          fetch(`/api/episode-backdrop?code=${ep.episode}`)
            .then(res => res.json())
            .then(data => setBackdrop(data.backdrop));
        }
      });
  }, [id]);

  useEffect(() => {
    if (showNextEpisode && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showNextEpisode && countdown === 0 && nextEpisodeId) {
      router.push(`/watch/${nextEpisodeId}`);
    }
  }, [showNextEpisode, countdown, nextEpisodeId, router]);

  const handleVideoEnd = () => {
    if (nextEpisodeId) {
      setShowNextEpisode(true);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setCurrentTime(video.currentTime);
    setDuration(video.duration);
    
    // Check if audio is playing
    if (video.currentTime > 3 && video.volume > 0 && !video.muted) {
      // If video is playing but likely no audio track (very common issue)
      const audioTracks = (video as any).audioTracks;
      if (audioTracks && audioTracks.length === 0) {
        setAudioError(true);
      }
    }
    
    const timeRemaining = video.duration - video.currentTime;
    if (timeRemaining <= 30 && timeRemaining > 0 && nextEpisodeId && !showNextEpisode) {
      setShowNextPreview(true);
    } else if (timeRemaining > 30) {
      setShowNextPreview(false);
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', e);
    // Check if it's an audio codec issue
    const video = e.currentTarget;
    if (video.error) {
      setAudioError(true);
    }
  };

  const skipToNext = () => {
    if (nextEpisodeId) {
      router.push(`/watch/${nextEpisodeId}`);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Backdrop Banner */}
      <div className="relative h-[40vh] md:h-[50vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: backdrop ? `url(${backdrop})` : 'url(https://images4.alphacoders.com/131/1313607.png)',
          }}
        />
        
        {/* Header Content */}
        <div className="relative z-20 h-full flex flex-col justify-between p-4 md:p-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit backdrop-blur-sm bg-black/30 px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Episodes
          </Link>

          {episode && (
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-[var(--accent)] bg-[var(--accent)]/20 px-3 py-1 rounded-full">
                  {episode.episode}
                </span>
                <span className="text-sm text-gray-300">{episode.air_date}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl mb-4">
                {episode.name}
              </h1>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-12">
        
        {/* Report Issue */}
        <div className="flex justify-end mb-1">
          <Link
            href={`/report/${id}`}
            className="text-[10px] text-[var(--accent)] hover:text-white/60 transition-colors uppercase tracking-[0.2em] font-bold"
          >
            Report Anomaly
          </Link>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-8 border border-[var(--accent)]/30 relative portal-glow bg-zinc-900/50">
          <VideoPlayer
            src={finalVideoUrl}
            episodeId={id}
            autoPlay={true}
            showCCButton={true}
            enableSubtitles={true}
            onEnded={handleVideoEnd}
            onTimeUpdate={(time, dur) => {
              setCurrentTime(time);
              setDuration(dur);
              setVideoLoading(false); // Video is playing
              
              // Show next episode preview in last 30 seconds
              if (dur - time <= 30 && dur - time > 0) {
                setShowNextPreview(true);
              }
            }}
            onError={() => {
              setAudioError(true);
              setVideoLoading(false);
            }}
          />

          {/* Skip to Next Episode Button (during credits - last 30 seconds) */}
          {showNextPreview && nextEpisodeId && !showNextEpisode && (
            <div className="absolute bottom-20 right-6 z-50 animate-fade-in">
              <button
                onClick={skipToNext}
                className="flex items-center gap-3 px-6 py-4 bg-white/95 hover:bg-white rounded-lg font-bold text-black transition-all transform hover:scale-105 shadow-2xl"
              >
                <span className="text-lg">Skip to Next Episode</span>
                <SkipForward className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Full Screen Countdown Overlay (after video ends) */}
          {showNextEpisode && nextEpisodeId && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="mb-4">
                  <SkipForward className="w-16 h-16 mx-auto text-[var(--accent)] animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Next Episode Starting in {countdown}s
                </h3>
                <p className="text-gray-400 mb-6">
                  Episode {nextEpisodeId}
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowNextEpisode(false)}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={skipToNext}
                    className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded text-white font-bold transition-colors"
                  >
                    Play Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Next Episode Button (only if not last episode) */}
        {nextEpisodeId && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3">Next episode will play automatically</p>
            <button
              onClick={skipToNext}
              className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-glow)] rounded-lg font-bold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
            >
              <SkipForward className="w-5 h-5" />
              Skip to Episode {nextEpisodeId}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
