'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  isListening?: boolean;
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
  status: _status,
  isListening: _isListening = false,
  isActivePlayer,
}: MessageAudioPlayerProps) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [actualDuration, setActualDuration] = useState(
    propDuration && !isNaN(propDuration) && isFinite(propDuration) && propDuration > 0 ? propDuration : 0
  );

  const audioRef  = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const propDurationValid = propDuration && !isNaN(propDuration) && isFinite(propDuration) && propDuration > 0;
  const propDurationValidRef = useRef(propDurationValid);
  useEffect(() => { propDurationValidRef.current = propDurationValid; }, [propDurationValid]);
  const propDurationRef = useRef(propDuration);
  useEffect(() => { propDurationRef.current = propDuration; }, [propDuration]);
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (propDurationValid) setActualDuration(propDuration);
  }, [propDuration, propDurationValid]);

  const waveformData = useMemo(() => {
    if (propWaveformData && propWaveformData.length > 0) return propWaveformData;
    return Array(60).fill(0).map((_, i) => 0.2 + 0.6 * Math.abs(Math.sin(i / 60 * Math.PI * 8 + i * 0.3)));
  }, [propWaveformData]);

  // ── Canvas draw ──────────────────────────────────────────────────────────────
  const drawnWidthRef = useRef(0);

  const drawWave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height || 48;
    if (cssW < 4) { requestAnimationFrame(drawWave); return; }
    drawnWidthRef.current = cssW;
    const dpr = window.devicePixelRatio || 1;
    const newW = Math.round(cssW * dpr);
    const newH = Math.round(cssH * dpr);
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width  = newW;
      canvas.height = newH;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bars = waveformData.length;
    const gap  = 1;
    const barW = Math.max(1, (cssW - gap * (bars - 1)) / bars);
    const prog = actualDuration > 0 ? currentTime / actualDuration : 0;
    const progressX = prog * cssW;
    ctx.clearRect(0, 0, cssW, cssH);
    for (let i = 0; i < bars; i++) {
      const amp    = Math.max(waveformData[i] ?? 0, 0.05);
      const barH   = Math.round(amp * (cssH - 4));
      const x      = i * (barW + gap);
      const y      = (cssH - barH) / 2;
      const barCenter = x + barW / 2;
      const passed = prog > 0 && barCenter <= progressX;
      ctx.fillStyle = passed
        ? (isSent ? '#f97316' : '#3b82f6')
        : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, 1);
      else ctx.rect(x, y, barW, barH);
      ctx.fill();
    }
  }, [waveformData, currentTime, actualDuration, isSent]);

  // Redraw whenever progress or waveform changes
  useEffect(() => { drawWave(); }, [drawWave]);

  // Redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => drawWave());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawWave]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Fallback: enable player after 2s regardless of buffer state
    const loadTimeout = setTimeout(() => {
      if (!audioLoaded) setAudioLoaded(true);
    }, 2000);


    const syncDurationFromElement = () => {
      const d = audio.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0) {
        setActualDuration(d);
        return;
      }
      if (propDurationValidRef.current) {
        setActualDuration(propDurationRef.current);
      }
    };

    const handleLoadedMetadata = () => syncDurationFromElement();
    const handleDurationChange  = () => syncDurationFromElement();
    const handleCanPlay = () => {
      clearTimeout(loadTimeout);
      setAudioLoaded(true);
      syncDurationFromElement();
    };
    const handleTimeUpdate = () => {
      if (!isPlayingRef.current) setCurrentTime(audio.currentTime);
      syncDurationFromElement();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (onPlayStatusChange && messageId && senderId) {
        if (!isSent) console.log('🎧 Fully listened, notifying sender', senderId);
        onPlayStatusChange(messageId, senderId, false, true);
      }
    };
    const handleError = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      console.error('🎵 Audio error:', { code: el.error?.code, message: el.error?.message, audioUrl });
      setAudioLoaded(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange',  handleDurationChange);
    audio.addEventListener('canplay',         handleCanPlay);
    audio.addEventListener('timeupdate',      handleTimeUpdate);
    audio.addEventListener('ended',           handleEnded);
    audio.addEventListener('error',           handleError);

    audio.load();

    return () => {
      clearTimeout(loadTimeout);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange',  handleDurationChange);
      audio.removeEventListener('canplay',         handleCanPlay);
      audio.removeEventListener('timeupdate',      handleTimeUpdate);
      audio.removeEventListener('ended',           handleEnded);
      audio.removeEventListener('error',           handleError);
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth RAF progress while playing
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;
    let rafId: number;
    const update = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        rafId = requestAnimationFrame(update);
      }
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Single-player enforcement + auto-play
  const pendingAutoPlay = useRef(false);

  useEffect(() => {
    if (isActivePlayer === undefined) return;
    const audio = audioRef.current;
    if (isActivePlayer) {
      if (audio && audioLoaded && !isPlaying) {
        audio.play().catch(err => console.error('🎵 Auto-play error:', err));
        setIsPlaying(true);
        if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
      } else if (!audioLoaded) {
        pendingAutoPlay.current = true;
      }
    } else {
      pendingAutoPlay.current = false;
      if (audio && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, false, false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivePlayer]);

  useEffect(() => {
    if (!audioLoaded || !pendingAutoPlay.current) return;
    pendingAutoPlay.current = false;
    const audio = audioRef.current;
    if (!audio || isPlaying) return;
    audio.play().catch(err => console.error('🎵 Pending auto-play error:', err));
    setIsPlaying(true);
    if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioLoaded]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !audioLoaded) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, false, false);
    } else {
      audioRef.current.play().catch(err => console.error('🎵 Play error:', err));
      setIsPlaying(true);
      if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !audioLoaded || actualDuration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 4) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * actualDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe cross-origin check (no window access at module level)
  const isCrossOrigin = typeof window !== 'undefined'
    && audioUrl.startsWith('http')
    && !audioUrl.includes(window.location.hostname);

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        {...(isCrossOrigin ? { crossOrigin: 'anonymous' } : {})}
      />

      <div className={styles.controls}>
        <button
          onClick={togglePlayPause}
          disabled={!audioLoaded}
          className={styles.playBtn}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {!audioLoaded
            ? <i className="fas fa-spinner fa-pulse" />
            : isPlaying
            ? <i className="fas fa-pause" />
            : <i className="fas fa-play" />}
        </button>

        <canvas
          ref={canvasRef}
          className={styles.waveCanvas}
          onClick={handleSeek}
          style={{ cursor: audioLoaded ? 'pointer' : 'default' }}
          aria-label="Audio waveform"
          role="img"
        />
      </div>

      <div className={`${styles.bottomRow} ${isSent ? styles.bottomRowSent : styles.bottomRowReceived}`}>
        <span>{formatTime(currentTime)} / {formatTime(actualDuration)}</span>
        <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
