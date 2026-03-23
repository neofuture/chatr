'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallStatus = 'idle' | 'ringing-outbound' | 'ringing-inbound' | 'connecting' | 'active' | 'ended';

export interface CallPeer {
  id: string;
  username?: string;
  displayName?: string | null;
  profileImage?: string | null;
}

export interface CallState {
  status: CallStatus;
  callId: string | null;
  peer: CallPeer | null;
  isMuted: boolean;
  duration: number;
  endReason: string | null;
}

interface CallContextType extends CallState {
  initiateCall: (receiverId: string, receiverInfo?: Partial<CallPeer>) => Promise<void>;
  acceptCall: () => void;
  rejectCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const initialState: CallState = {
  status: 'idle',
  callId: null,
  peer: null,
  isMuted: false,
  duration: 0,
  endReason: null,
};

const CallContext = createContext<CallContextType>({
  ...initialState,
  initiateCall: async () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  hangup: () => {},
  toggleMute: () => {},
});

export const useCall = () => useContext(CallContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
//
// CallProvider itself never calls useWebSocket() — that would make it a consumer
// of WebSocketContext and re-render the entire child tree on every socket
// connect/disconnect.  Instead, a tiny <CallSocketBridge/> child component
// subscribes to the socket and manages event listeners; it renders nothing, so
// its re-renders are invisible.

// Module-level ref shared between CallProvider and CallSocketBridge
const socketRef: { current: import('socket.io-client').Socket | null } = { current: null };

export function CallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CallState>(initialState);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Keep refs in sync
  useEffect(() => { callIdRef.current = state.callId; }, [state.callId]);
  useEffect(() => { peerIdRef.current = state.peer?.id ?? null; }, [state.peer]);

  // ── Cleanup helpers ──────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    iceCandidateBuffer.current = [];
  }, []);

  const resetToIdle = useCallback((endReason?: string) => {
    cleanup();
    setState({ ...initialState, status: 'ended', endReason: endReason ?? null });
    setTimeout(() => setState(initialState), 2500);
  }, [cleanup]);

  // ── Duration timer ─────────────────────────────────────────────────────

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setState(prev => ({ ...prev, duration: 0 }));
    durationIntervalRef.current = setInterval(() => {
      setState(prev => prev.status === 'active' ? { ...prev, duration: prev.duration + 1 } : prev);
    }, 1000);
  }, []);

  // ── Create peer connection ─────────────────────────────────────────────

  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('call:ice-candidate', {
          callId,
          targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (socketRef.current && callIdRef.current) {
          socketRef.current.emit('call:hangup', { callId: callIdRef.current });
        }
        resetToIdle('connection_failed');
      }
    };

    return pc;
  }, [resetToIdle]);

  // ── Get microphone ─────────────────────────────────────────────────────

  const acquireMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        window.isSecureContext
          ? 'Microphone access is not supported on this device.'
          : 'Microphone requires a secure (HTTPS) connection.',
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ── Initiate call (caller) ─────────────────────────────────────────────

  const initiateCall = useCallback(async (receiverId: string, receiverInfo?: Partial<CallPeer>) => {
    const s = socketRef.current;
    if (!s || stateRef.current.status !== 'idle') return;

    setState({
      status: 'ringing-outbound',
      callId: null,
      peer: { id: receiverId, ...receiverInfo },
      isMuted: false,
      duration: 0,
      endReason: null,
    });

    try {
      const res: any = await new Promise((resolve, reject) => {
        s.emit('call:initiate', { receiverId }, (response: any) => {
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        });
      });

      setState(prev => ({ ...prev, callId: res.callId }));
    } catch (err: any) {
      resetToIdle(err.message || 'failed');
    }
  }, [resetToIdle]);

  // ── Accept call (receiver) ─────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    const s = socketRef.current;
    const { callId, status, peer } = stateRef.current;
    if (!s || !callId || status !== 'ringing-inbound') return;

    setState(prev => ({ ...prev, status: 'connecting' }));
    s.emit('call:accept', { callId });

    try {
      const stream = await acquireMicrophone();
      const pc = createPeerConnection(peer!.id, callId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      // ICE candidates buffered before the offer arrives are drained
      // inside onOffer after setRemoteDescription — not here.
    } catch (err: any) {
      console.error('❌ Failed to accept call:', err);
      s.emit('call:hangup', { callId });
      resetToIdle(err?.message?.includes('HTTPS') ? 'mic_https' : 'mic_error');
    }
  }, [acquireMicrophone, createPeerConnection, resetToIdle]);

  // ── Reject call ────────────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    const s = socketRef.current;
    const { callId } = stateRef.current;
    if (!s || !callId) return;
    s.emit('call:reject', { callId });
    resetToIdle('rejected');
  }, [resetToIdle]);

  // ── Hang up ────────────────────────────────────────────────────────────

  const hangup = useCallback(() => {
    const s = socketRef.current;
    const { callId } = stateRef.current;
    if (!s || !callId) return;
    s.emit('call:hangup', { callId });
    resetToIdle('hangup');
  }, [resetToIdle]);

  // ── Toggle mute ────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Listen for chatr:call custom events dispatched by panel action buttons.
  useEffect(() => {
    const handler = (e: Event) => {
      const { userId, ...info } = (e as CustomEvent).detail;
      if (userId) initiateCall(userId, info);
    };
    window.addEventListener('chatr:call', handler);
    return () => window.removeEventListener('chatr:call', handler);
  }, [initiateCall]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Context value only changes when call state changes — never on socket reconnect
  const value = useMemo(() => ({
    ...state,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
  }), [state, initiateCall, acceptCall, rejectCall, hangup, toggleMute]);

  return (
    <CallContext.Provider value={value}>
      <CallSocketBridge
        callIdRef={callIdRef}
        peerIdRef={peerIdRef}
        pcRef={pcRef}
        iceCandidateBuffer={iceCandidateBuffer}
        setState={setState}
        acquireMicrophone={acquireMicrophone}
        createPeerConnection={createPeerConnection}
        resetToIdle={resetToIdle}
        startDurationTimer={startDurationTimer}
      />
      {children}
    </CallContext.Provider>
  );
}

// ─── Socket Bridge ────────────────────────────────────────────────────────────
// Subscribes to WebSocketContext in isolation.  When the socket changes this
// component re-renders, but because it returns null, the re-render is invisible
// and never touches the rest of the component tree.

interface BridgeProps {
  callIdRef: React.MutableRefObject<string | null>;
  peerIdRef: React.MutableRefObject<string | null>;
  pcRef: React.MutableRefObject<RTCPeerConnection | null>;
  iceCandidateBuffer: React.MutableRefObject<RTCIceCandidateInit[]>;
  setState: React.Dispatch<React.SetStateAction<CallState>>;
  acquireMicrophone: () => Promise<MediaStream>;
  createPeerConnection: (targetUserId: string, callId: string) => RTCPeerConnection;
  resetToIdle: (endReason?: string) => void;
  startDurationTimer: () => void;
}

const CallSocketBridge = React.memo(function CallSocketBridge({
  callIdRef, peerIdRef, pcRef, iceCandidateBuffer,
  setState, acquireMicrophone, createPeerConnection, resetToIdle, startDurationTimer,
}: BridgeProps) {
  const { socket } = useWebSocket();

  // Keep the module-level ref current for the action callbacks in CallProvider
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: { callId: string; caller: CallPeer }) => {
      if (callIdRef.current) {
        socket.emit('call:reject', { callId: data.callId });
        return;
      }
      setState({
        status: 'ringing-inbound',
        callId: data.callId,
        peer: data.caller,
        isMuted: false,
        duration: 0,
        endReason: null,
      });
    };

    const onAccepted = async (data: { callId: string }) => {
      if (data.callId !== callIdRef.current) return;
      setState(prev => ({ ...prev, status: 'connecting' }));
      try {
        const stream = await acquireMicrophone();
        const pc = createPeerConnection(peerIdRef.current!, data.callId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { callId: data.callId, targetUserId: peerIdRef.current, sdp: offer });
      } catch (err: any) {
        console.error('❌ Failed to create offer:', err);
        socket.emit('call:hangup', { callId: data.callId });
        resetToIdle(err?.message?.includes('HTTPS') ? 'mic_https' : 'mic_error');
      }
    };

    const onOffer = async (data: { callId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (data.callId !== callIdRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const c of iceCandidateBuffer.current) await pc.addIceCandidate(new RTCIceCandidate(c));
        iceCandidateBuffer.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { callId: data.callId, targetUserId: data.fromUserId, sdp: answer });
        setState(prev => ({ ...prev, status: 'active' }));
        startDurationTimer();
      } catch (err) { console.error('❌ Failed to handle offer:', err); }
    };

    const onAnswer = async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (data.callId !== callIdRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const c of iceCandidateBuffer.current) await pc.addIceCandidate(new RTCIceCandidate(c));
        iceCandidateBuffer.current = [];
        setState(prev => ({ ...prev, status: 'active' }));
        startDurationTimer();
      } catch (err) { console.error('❌ Failed to handle answer:', err); }
    };

    const onIceCandidate = async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (data.callId !== callIdRef.current) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) { iceCandidateBuffer.current.push(data.candidate); return; }
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
      catch (err) { console.error('❌ Failed to add ICE candidate:', err); }
    };

    const onEnded = (data: { callId: string; reason: string }) => {
      if (data.callId !== callIdRef.current) return;
      resetToIdle(data.reason);
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:ended', onEnded);
    };
  }, [socket, callIdRef, peerIdRef, pcRef, iceCandidateBuffer, setState, acquireMicrophone, createPeerConnection, resetToIdle, startDurationTimer]);

  return null;
});
