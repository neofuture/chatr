'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './MessageAudioPlayer.module.css';

export interface MessageAudioPlayerProps {
  audioUrl: string;
  duration: number;
  waveformData: number[];
  timestamp: Date;
  isSent: boolean;
  messageId?: string;
  senderId?: string;
  onPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  status?: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isListening?: boolean; // recipient is actively listening right now
  /** When true this player is the globally active one and should auto-play.
   *  When false and this player is currently playing it should pause. */
  isActivePlayer?: boolean;
}

export default function MessageAudioPlayer({
  audioUrl,
  duration: propDuration,
  waveformData: propWaveformData,
  timestamp,
  isSent,
  messageId,
  senderId,
  onPlayStatusChange,
  status,
  isListening = false,
  isActivePlayer,
}: MessageAudioPlayerProps) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [actualDuration, setActualDuration] = useState(
    propDuration && !isNaN(propDuration) && isFinite(propDuration) ? propDuration : 0
  );

  const audioRef = useRef<HTMLAudioElement>(null);

  // Use useMemo to ensure waveform data is stable and doesn't regenerate on every render
  const waveformData = useMemo(() => {
    const hasData = propWaveformData && propWaveformData.length > 0;
    console.log('🎵 Waveform data check:', {
      hasData,
      length: propWaveformData?.length,
      firstSamples: propWaveformData?.slice(0, 10),
      lastSamples: propWaveformData?.slice(-10),
      minValue: hasData ? Math.min(...propWaveformData) : null,
      maxValue: hasData ? Math.max(...propWaveformData) : null,
      avgValue: hasData ? propWaveformData.reduce((a, b) => a + b, 0) / propWaveformData.length : null,
      propDuration: propDuration,
      propDurationValid: !isNaN(propDuration) && isFinite(propDuration),
    });

    if (hasData) {
      console.log('✅ Using real waveform data');
      return propWaveformData; // ✅ Use real recorded data (0-1 range)
    }

    // Fallback: generate realistic-looking waveform with varying amplitudes
    console.warn('⚠️ No waveform data - using fallback');
    return Array(100).fill(0).map(() => {
      // Generate more realistic waveform with variation (0.1 to 0.9 range)
      return Math.random() * 0.6 + 0.2;
    });
  }, [propWaveformData]); // Only regenerate if prop changes

  useEffect(() => {
    console.log('🎵 VoiceNotePlayer mounted:', {
      hasWaveformData: propWaveformData && propWaveformData.length > 0,
      waveformLength: propWaveformData?.length,
      usingFallback: !propWaveformData || propWaveformData.length === 0,
      isSent,
    });
  }, [propWaveformData, isSent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🎵 Initializing audio player:', { audioUrl, propDuration });

    // Timeout fallback: If audio doesn't load within 3 seconds, enable anyway
    // This prevents infinite loading state due to CORS, slow network, etc.
    const loadTimeout = setTimeout(() => {
      if (!audioLoaded && audio.readyState >= 2) {
        // readyState >= 2 means we have current data (can start playing)
        console.log('🎵 ⏱️ Load timeout - enabling play button (readyState:', audio.readyState, ')');
        setAudioLoaded(true);

        // Set duration if we have it
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setActualDuration(audio.duration);
        }
      } else if (!audioLoaded) {
        console.warn('🎵 ⚠️ Load timeout - audio not ready yet (readyState:', audio.readyState, ')');
        // Enable anyway - user can try to play
        setAudioLoaded(true);
      }
    }, 3000); // 3 second timeout

    const handleLoadedMetadata = () => {
      console.log('🎵 [1/5] Metadata loaded');
      // Get actual duration from audio file
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setActualDuration(audio.duration);
        console.log('🎵 [1/5] Duration:', audio.duration.toFixed(1) + 's');
      }
    };

    const handleCanPlayThrough = () => {
      // Extra verification: Check if we actually have the full file buffered
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration;
        const percentBuffered = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

        console.log('🎵 [5/5] ✅ Can play through - checking buffer...');
        console.log('🎵 [5/5] Buffered:', bufferedEnd.toFixed(1) + 's / ' + duration.toFixed(1) + 's (' + percentBuffered.toFixed(1) + '%)');

        // Only enable if we have at least 99% buffered
        if (percentBuffered >= 99) {
          console.log('🎵 [5/5] ✅ ENTIRE audio downloaded - enabling play button');
          clearTimeout(loadTimeout); // Clear timeout since we loaded successfully
          setAudioLoaded(true);
        } else {
          console.log('🎵 [5/5] ⏳ Not fully buffered yet, waiting...');
          // Wait a bit and check again
          setTimeout(() => {
            if (audio.buffered.length > 0) {
              const newBufferedEnd = audio.buffered.end(audio.buffered.length - 1);
              const newPercent = duration > 0 ? (newBufferedEnd / duration) * 100 : 0;
              if (newPercent >= 99 || newBufferedEnd >= duration - 0.1) {
                console.log('🎵 [5/5] ✅ Now fully buffered - enabling play button');
                clearTimeout(loadTimeout); // Clear timeout
                setAudioLoaded(true);
              }
            }
          }, 500);
        }
      } else {
        console.log('🎵 [5/5] No buffer data available yet');
      }
    };

    const handleCanPlay = () => {
      console.log('🎵 [3/5] Can play - audio buffered (but may NOT be complete)');
      console.log('🎵 [3/5] ⏳ Waiting for full download (canplaythrough)...');
      // DON'T set loaded here - must wait for canplaythrough
    };

    const handleLoadedData = () => {
      console.log('🎵 [2/5] Data loaded - first frame available');
      // DON'T set loaded here - must wait for canplaythrough
    };

    const handleTimeUpdate = () => {
      // Fallback update if RAF isn't running
      if (!isPlaying) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;

      if (onPlayStatusChange && messageId && senderId) {
        if (!isSent) {
          console.log('🎧 Fully listened, notifying sender', senderId);
        }
        // Fire for both sent & received so auto-advance works in all cases
        onPlayStatusChange(messageId, senderId, false, true); // isEnded = true
      }
    };

    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const error = audioElement.error;

      console.error('🎵 Audio error:', {
        code: error?.code,
        message: error?.message,
        audioUrl: audioUrl,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
      });

      // Error codes:
      // 1 = MEDIA_ERR_ABORTED
      // 2 = MEDIA_ERR_NETWORK
      // 3 = MEDIA_ERR_DECODE
      // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED

      if (error?.code === 4) {
        console.error('🎵 Audio format not supported or file not found');
      } else if (error?.code === 2) {
        console.error('🎵 Network error loading audio');
      }

      setAudioLoaded(false);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration;
        if (duration > 0) {
          const percentLoaded = (bufferedEnd / duration) * 100;

          // Only log at 25%, 50%, 75%, and 100% to reduce console spam
          const rounded = Math.round(percentLoaded / 25) * 25;
          if (rounded === 25 || rounded === 50 || rounded === 75) {
            if (!audio.dataset[`logged${rounded}`]) {
              console.log('🎵 [4/5] Download progress:', rounded + '%');
              audio.dataset[`logged${rounded}`] = 'true';
            }
          }

          // Log when we hit 100%
          if (percentLoaded >= 99.9 && !audio.dataset.logged100) {
            console.log('🎵 [4/5] Download progress: 100% ✅');
            audio.dataset.logged100 = 'true';
          }
        }
      }
    };

    const handleWaiting = () => {
      console.log('🎵 ⏳ Buffering - waiting for more data...');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough); // Wait for full download
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Try to trigger load immediately
    audio.load();

    return () => {
      clearTimeout(loadTimeout); // Clean up timeout
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, propDuration]);

  // Smooth animation updates using RAF
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    let rafId: number;

    const updateProgress = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    rafId = requestAnimationFrame(updateProgress);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  // ── Single-player enforcement + auto-play ─────────────
  // Track whether we're waiting to auto-play once audio loads
  const pendingAutoPlay = useRef(false);

  useEffect(() => {
    if (isActivePlayer === undefined) return; // unmanaged — old behaviour

    if (isActivePlayer) {
      // We've been chosen as the active player
      const audio = audioRef.current;
      if (audio && audioLoaded && !isPlaying) {
        // Audio already loaded — play immediately
        audio.play().catch(err => console.error('🎵 Auto-play error:', err));
        setIsPlaying(true);
        if (onPlayStatusChange && messageId && senderId) {
          onPlayStatusChange(messageId, senderId, true, false);
        }
      } else if (!audioLoaded) {
        // Not loaded yet — mark pending; the audioLoaded branch below will pick it up
        pendingAutoPlay.current = true;
      }
    } else {
      // Another player became active — cancel any pending auto-play and pause
      pendingAutoPlay.current = false;
      const audio = audioRef.current;
      if (audio && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (onPlayStatusChange && messageId && senderId) {
          onPlayStatusChange(messageId, senderId, false, false);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivePlayer]);

  // When audio finishes loading, check if we were waiting to auto-play
  useEffect(() => {
    if (!audioLoaded || !pendingAutoPlay.current) return;
    pendingAutoPlay.current = false;
    const audio = audioRef.current;
    if (!audio || isPlaying) return;
    audio.play().catch(err => console.error('🎵 Pending auto-play error:', err));
    setIsPlaying(true);
    if (onPlayStatusChange && messageId && senderId) {
      onPlayStatusChange(messageId, senderId, true, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioLoaded]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !audioLoaded) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);

      // Paused - remove "Listening..." indicator but do NOT mark as read
      if (!isSent && onPlayStatusChange && messageId && senderId) {
        onPlayStatusChange(messageId, senderId, false, false); // isEnded=false = paused
      }
      // For sent messages we still need to tell the parent to clear active
      if (isSent && onPlayStatusChange && messageId && senderId) {
        onPlayStatusChange(messageId, senderId, false, false);
      }
    } else {
      audioRef.current.play().catch(err => {
        console.error('🎵 Play error:', err);
      });
      setIsPlaying(true);

      // Notify parent — this triggers activeAudioMessageId update which stops other players
      if (onPlayStatusChange && messageId && senderId) {
        onPlayStatusChange(messageId, senderId, true, false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // formatTimestamp not needed - timestamp shown by parent bubble component
  // const formatTimestamp = (date: Date) => {
  //   return date.toLocaleTimeString('en-US', {
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     hour12: false
  //   });
  // };

  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // Detect if URL is cross-origin
  const isCrossOrigin = audioUrl.startsWith('http') && !audioUrl.includes(window.location.hostname);

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        {...(isCrossOrigin && { crossOrigin: 'anonymous' })}
        playsInline
      />


      {/* Play button and waveform */}
      <div className={styles.controls}>
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          disabled={!audioLoaded}
          className={styles.playBtn}
        >
          {!audioLoaded ? <i className="fas fa-spinner fa-pulse"></i> : isPlaying ? <i className="fas fa-pause"></i> : <i className="fas fa-play"></i>}
        </button>

        {/* Waveform - clickable for seeking */}
        <div
          onClick={(e) => {
            if (!audioRef.current || !audioLoaded) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = percentage * actualDuration;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            console.log('🎵 Waveform seek to:', { newTime, percentage: percentage * 100 });
          }}
          className={`${styles.waveform} ${audioLoaded ? styles.waveformSeekable : styles.waveformStatic}`}
        >
          {waveformData.map((amplitude, index) => {
            const progressPercentage = (index / waveformData.length) * 100;
            const isPassed = progressPercentage <= progress;
            const playedColor = isSent ? '#f97316' : '#3b82f6';
            const unplayedColor = 'rgba(255, 255, 255, 0.4)';
            const barHeight = Math.max(amplitude * 100, 5);
            return (
              <div
                key={index}
                className={styles.waveBar}
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: isPassed ? playedColor : unplayedColor,
                  marginRight: index < waveformData.length - 1 ? '1px' : '0',
                }}
              />
            );
          })}
        </div>
      </div>


      {/* Bottom row: time on one side, timestamp on the other */}
      <div className={`${styles.bottomRow} ${isSent ? styles.bottomRowSent : styles.bottomRowReceived}`}>
        <span>{formatTime(currentTime)} / {formatTime(actualDuration)}</span>
        <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}


