'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/form-controls/Button/Button';
import styles from './VoiceRecorder.module.css';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, waveformData: number[]) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, onRecordingStart, onRecordingStop, disabled = false }: VoiceRecorderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waveformDataRef = useRef<number[]>([]);
  const waveformScrollRef = useRef<HTMLDivElement | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const isCanceledRef = useRef<boolean>(false);

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  // Play beep sound
  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    // Clean up after beep
    setTimeout(() => {
      audioContext.close();
    }, 200);
  };

  // Capture waveform data
  const captureWaveform = () => {
    if (!analyserRef.current) return;

    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureTimeRef.current;

    // Throttle to ~10 updates per second (100ms) for better visualization
    if (timeSinceLastCapture >= 100) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate amplitude using peak detection for better dynamic range
      let max = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = Math.abs((dataArray[i] - 128) / 128);
        if (normalized > max) {
          max = normalized;
        }
      }

      // Improved balanced scaling with better mid-range representation
      // Uses exponential curve for more natural distribution
      let amplitude;
      if (max < 0.02) {
        // Silence/noise floor
        amplitude = 0.02;
      } else {
        // Exponential scaling: amplitude = max^0.6
        // This creates more variation in the middle range
        // 0.1 -> 0.25, 0.3 -> 0.52, 0.5 -> 0.66, 0.8 -> 0.84, 1.0 -> 1.0
        amplitude = Math.min(Math.pow(max, 0.6), 1.0);
      }

      // Add new waveform data (keep growing from left to right)
      const newWaveformData = [...waveformDataRef.current, amplitude];
      waveformDataRef.current = newWaveformData;
      setWaveformData(newWaveformData);

      // Debug log with peak detection info
      if (newWaveformData.length % 10 === 0) {
        console.log(`📊 Waveform: ${newWaveformData.length} bars, peak: ${max.toFixed(3)}, amplitude: ${(amplitude * 100).toFixed(1)}%, time since last: ${timeSinceLastCapture}ms`);
      }

      lastCaptureTimeRef.current = now;
    }

    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(captureWaveform);
    }
  };

  // Start recording
  const startRecording = async () => {
    if (disabled || isInitializing || isRecording) return;

    setIsModalOpen(true);
    setIsInitializing(true);
    setPermissionDenied(false);
    isCanceledRef.current = false; // Reset canceled flag
    audioChunksRef.current = [];
    waveformDataRef.current = [];
    setWaveformData([]);
    setRecordingTime(0);
    lastCaptureTimeRef.current = 0;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Initialize audio context for waveform visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Safari fix: Ensure AudioContext is running before proceeding
      console.log('🎵 AudioContext initial state:', audioContext.state);
      if (audioContext.state === 'suspended') {
        console.log('🎵 Resuming AudioContext for Safari...');
        await audioContext.resume();
        console.log('🎵 AudioContext resumed, state:', audioContext.state);
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3; // Lower smoothing for more responsive waveform
      source.connect(analyser);
      analyserRef.current = analyser;

      // Safari-specific: Wait for AudioContext to actually start processing
      // Safari needs more time than Chrome for the audio pipeline to be ready
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        console.log('🎵 Safari detected - adding extra initialization time');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Only send the recording if it wasn't canceled
        if (!isCanceledRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType
          });

          // Pass both audio blob and waveform data
          onRecordingComplete(audioBlob, waveformDataRef.current);
        }

        cleanup();
        setIsRecording(false);
        setRecordingTime(0);
        setWaveformData([]);

        // Close modal after a short delay to show completion
        setTimeout(() => {
          setIsModalOpen(false);
        }, 300);
      };

      // Simulate initialization time (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Play start beep
      playBeep();

      // Wait for beep to finish
      await new Promise(resolve => setTimeout(resolve, 150));

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Set recording state BEFORE starting waveform capture
      isRecordingRef.current = true;
      setIsRecording(true);
      setIsInitializing(false);

      // Notify parent that recording started
      onRecordingStart?.();

      // Safari needs more time for AudioContext to be fully ready
      // Increased delay from 100ms to 300ms for Safari
      const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
      const delay = isSafari ? 300 : 50;

      console.log(`🎵 Starting waveform capture in ${delay}ms (Safari: ${isSafari})`);

      setTimeout(() => {
        if (isRecordingRef.current) {
          lastCaptureTimeRef.current = Date.now(); // Initialize timestamp
          console.log('🎵 Waveform capture started');
          requestAnimationFrame(() => {
            captureWaveform();
          });
        }
      }, delay);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionDenied(true);
      setIsInitializing(false);
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    // Stop the recording loop
    isRecordingRef.current = false;

    // Notify parent that recording stopped
    onRecordingStop?.();

    // Play stop beep
    playBeep();

    // Stop media recorder
    mediaRecorderRef.current.stop();

    // Stop timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Stop waveform capture
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    // Set canceled flag BEFORE stopping recorder to prevent sending
    isCanceledRef.current = true;
    isRecordingRef.current = false;

    // Notify parent that recording stopped (canceled)
    onRecordingStop?.();

    // Stop media recorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    audioChunksRef.current = [];
    waveformDataRef.current = [];
    setWaveformData([]);
    cleanup();
    setIsRecording(false);
    setIsInitializing(false);
    setRecordingTime(0);
    setIsModalOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Auto-scroll waveform to the right as it grows
  useEffect(() => {
    if (waveformScrollRef.current && waveformData.length > 0) {
      // Smooth scroll to the rightmost position
      waveformScrollRef.current.scrollTo({
        left: waveformScrollRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [waveformData]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="red"
        fullWidth
        onClick={startRecording}
        disabled={disabled}
        icon={<i className="fas fa-microphone"></i>}
      >
        Record Voice Message
      </Button>

      {/* Recording Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={cancelRecording}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {isInitializing ? <><i className="fas fa-microphone"></i> Initializing...</> : <><i className="fas fa-microphone"></i> Recording Voice Message</>}
              </h3>
              <button
                className={styles.closeButton}
                onClick={cancelRecording}
                style={{
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Permission Error */}
            {permissionDenied && (
              <div className={styles.errorMessage} style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: isDark ? '#fca5a5' : '#dc2626',
              }}>
                <i className="fas fa-microphone-slash"></i> Microphone access denied. Please enable microphone permissions and try again.
              </div>
            )}

            {/* Initializing State */}
            {isInitializing && !permissionDenied && (
              <div className={styles.initializingContainer} style={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                color: isDark ? '#93c5fd' : '#2563eb',
              }}>
                <div className={styles.spinner}></div>
                <span>Setting up microphone...</span>
              </div>
            )}

            {/* Recording State */}
            {isRecording && !permissionDenied && (
              <>
                {/* Recording Info */}
                <div className={styles.recordingInfo}>
                  <div className={styles.recordingIndicator}>
                    <span className={styles.recordingDot}></span>
                    <span className={styles.recordingText}>Recording</span>
                  </div>
                  <div className={styles.recordingTime}>{formatTime(recordingTime)}</div>
                </div>

                {/* Waveform Display - renders from left to right */}
                <div className={styles.waveformContainer} style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                }}>
                  {waveformData.length === 0 ? (
                    <div className={styles.waveformPlaceholder}>
                      <span><i className="fas fa-microphone"></i> Listening... Speak to see waveform</span>
                    </div>
                  ) : (
                    <div className={styles.waveformScroll} ref={waveformScrollRef}>
                      <div className={styles.waveform}>
                        {waveformData.map((amplitude, index) => (
                          <div
                            key={index}
                            className={styles.waveformBar}
                            style={{
                              height: `${Math.max(amplitude * 100, 5)}%`,
                              backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                              animationDelay: `${index * 0.01}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Help Text */}
                <div className={styles.helpText} style={{
                  color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                }}>
                  Speak clearly into your microphone. Click Stop when finished.
                </div>

                {/* Action Buttons */}
                <div className={styles.modalActions}>
                  <Button
                    variant="secondary"
                    onClick={cancelRecording}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="red"
                    onClick={stopRecording}
                    icon={<span>⏹</span>}
                    style={{ flex: 1 }}
                  >
                    Stop & Send
                  </Button>
                </div>
              </>
            )}

            {/* Error State Actions */}
            {permissionDenied && (
              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  onClick={cancelRecording}
                  style={{ flex: 1 }}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

