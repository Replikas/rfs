'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(enableSubtitles);
  const [hasResumed, setHasResumed] = useState(false);
  
  // Generate subtitle URL
  const subtitleUrl = episodeId 
    ? `https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/subtitles/episode-${episodeId}-en.vtt`
    : null;
  
  // Sync enableSubtitles prop with state
  useEffect(() => {
    // Force subtitles ON if they should be enabled
    if (enableSubtitles) {
      setSubtitlesEnabled(true);
      const video = videoRef.current;
      if (video && video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
      }
    }
  }, [enableSubtitles]);

  // Debug: Log subtitle URL and check if it exists
  useEffect(() => {
    if (subtitleUrl) {
      console.log('Subtitle URL:', subtitleUrl);
      
      // Test if subtitle file exists
      fetch(subtitleUrl, { method: 'HEAD', mode: 'cors' })
        .then(response => {
          if (response.ok) {
            console.log('✅ Subtitle file exists and is accessible via CORS');
          } else {
            console.log(`❌ Subtitle file not found or inaccessible (Status: ${response.status})`);
          }
        })
        .catch(error => {
          console.error('❌ Error checking subtitle file (CORS issue?):', error);
        });
    }
  }, [subtitleUrl]);

  // Resume from saved time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (hasResumed) {
      console.log('Already resumed, skipping');
      return;
    }
    
    if (resumeTime === null || resumeTime <= 10) {
      console.log('No resume time or too early, starting from beginning');
      return;
    }
    
    const handleLoadedMetadata = () => {
      console.log(`Resuming playback from ${resumeTime}s`);
      video.currentTime = resumeTime;
      setHasResumed(true);
    };
    
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    }
  }, [resumeTime, hasResumed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Disable subtitles by default
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
    
    // Force track to load once when video is ready
    let trackLoadAttempted = false;
    const forceTrackLoad = () => {
      if (trackLoadAttempted) return;
      trackLoadAttempted = true;
      
      if (video.textTracks && video.textTracks.length > 0) {
        console.log('Force loading subtitle track...');
        const track = video.textTracks[0];
        if (track.mode === 'disabled') {
          track.mode = 'hidden'; // Use hidden to load cues without showing
          setTimeout(() => {
            track.mode = 'disabled';
          }, 100);
        }
      }
    };
    
    // Try to load track when video is ready
    if (video.readyState >= 2) {
      forceTrackLoad();
    } else {
      video.addEventListener('loadedmetadata', forceTrackLoad, { once: true });
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

  const toggleSubtitles = () => {
    const video = videoRef.current;
    
    // Debug: Check track elements in DOM
    const trackElements = video?.querySelectorAll('track');
    console.log('Track elements in DOM:', trackElements?.length);
    trackElements?.forEach((el, i) => {
      console.log(`DOM Track ${i}:`, {
        src: el.src,
        readyState: el.readyState,
        track: el.track
      });
    });
    
    if (!video || !video.textTracks || video.textTracks.length === 0) {
      console.log('No text tracks available on video element');
      console.log('Video element:', video);
      return;
    }

    const newState = !subtitlesEnabled;
    setSubtitlesEnabled(newState);

    console.log(`Setting subtitles to: ${newState ? 'showing' : 'disabled'}`);
    console.log(`Video current time: ${video.currentTime}s`);
    
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      track.mode = newState ? 'showing' : 'disabled';
      console.log(`Track ${i} mode:`, track.mode);
      console.log(`Track ${i} label:`, track.label);
      console.log(`Track ${i} language:`, track.language);
      console.log(`Track ${i} cues:`, track.cues ? track.cues.length : 'null');
      console.log(`Track ${i} activeCues:`, track.activeCues ? track.activeCues.length : 'null');
      
      // Summary for debugging
      if (newState && track.cues && track.cues.length > 0) {
        const activeCuesCount = track.activeCues ? track.activeCues.length : 0;
        if (activeCuesCount > 0) {
          console.log(`✅ ${activeCuesCount} cue(s) active - subtitles SHOULD be visible`);
        } else {
          console.warn(`⚠️ No active cues at time ${video.currentTime}s`);
        }
      }
      
      if (newState && track.cues && track.cues.length === 0) {
        console.warn('⚠️ Track has no cues - subtitle file might be empty or invalid');
      }
      
      if (newState && !track.cues) {
        console.error('⚠️ Track cues are NULL - track file never loaded!');
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className="w-full h-full bg-black relative"
        controlsList="nodownload"
        crossOrigin="anonymous"
        style={{ position: 'relative', zIndex: 0 }}
      >
        {subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang="en"
            label="English"
            default={false}
            onError={(e) => {
              console.error('❌ Subtitle track failed to load:', e);
              console.error('Track element:', e.target);
            }}
            onLoad={(e) => {
              console.log('✅ Subtitle track loaded successfully');
              const track = e.target as HTMLTrackElement;
              console.log('Track readyState:', track.readyState);
              console.log('Track track:', track.track);
            }}
          />
        )}
      </video>
      
      {/* Custom CC Button */}
      {subtitleUrl && showCCButton && (
        <button
          onClick={toggleSubtitles}
          className={`absolute bottom-4 right-4 px-2 py-1 rounded text-[10px] font-bold transition-all z-50 ${
            subtitlesEnabled 
              ? 'bg-blue-600 text-white' 
              : 'bg-black/70 text-white hover:bg-black/90'
          }`}
          title={subtitlesEnabled ? 'Disable Subtitles' : 'Enable Subtitles'}
        >
          CC
        </button>
      )}
    </div>
  );
}
