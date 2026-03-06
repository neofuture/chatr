'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Message } from '@/components/MessageBubble';
import ChatView from '@/components/messaging/ChatView/ChatView';
import EmojiPicker from '@/components/EmojiPicker/EmojiPicker';
import styles from './GroupView.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GroupMember {
  id: string;
  userId: string;
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
}

export interface GroupData {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  members: GroupMember[];
}

interface Props {
  group: GroupData;
  isDark: boolean;
  currentUserId: string;
}

export default function GroupView({ group, isDark, currentUserId }: Props) {
  const { socket, connected } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<{ userId: string; displayName: string }[]>([]);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [listeningMessageIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const typingEmitTimer = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Load message history
  useEffect(() => {
    if (!group.id) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/groups/${group.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const msgs: Message[] = (data.messages ?? []).map((m: any) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          recipientId: group.id,
          direction: m.senderId === currentUserId ? 'sent' : 'received',
          status: 'delivered' as Message['status'],
          timestamp: new Date(m.createdAt),
          type: (m.type || 'text') as Message['type'],
          senderDisplayName: m.sender?.displayName || m.sender?.username?.replace(/^@/, '') || 'Unknown',
          senderUsername: m.sender?.username,
          senderProfileImage: m.sender?.profileImage ?? null,
        }));
        setMessages(msgs);
      })
      .catch(console.error);
  }, [group.id, currentUserId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onMessage = (data: any) => {
      if (data.groupId !== group.id) return;
      const msg: Message = {
        id: data.id,
        content: data.content,
        senderId: data.senderId,
        recipientId: group.id,
        direction: data.senderId === currentUserId ? 'sent' : 'received',
        status: 'delivered' as Message['status'],
        timestamp: new Date(data.createdAt),
        type: (data.type || 'text') as Message['type'],
        senderDisplayName: data.sender?.displayName || data.sender?.username?.replace(/^@/, '') || 'Unknown',
        senderUsername: data.sender?.username,
        senderProfileImage: data.sender?.profileImage ?? null,
      };
      setMessages(prev => {
        if (data.tempId) {
          const idx = prev.findIndex(m => m.id === data.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = msg;
            return updated;
          }
        }
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = (data: any) => {
      if (data.groupId !== group.id || data.userId === currentUserId) return;
      if (data.isTyping) {
        setIsTyping(prev => prev.find(t => t.userId === data.userId) ? prev : [...prev, { userId: data.userId, displayName: data.displayName }]);
        if (typingTimers.current[data.userId]) clearTimeout(typingTimers.current[data.userId]);
        typingTimers.current[data.userId] = setTimeout(() => {
          setIsTyping(prev => prev.filter(t => t.userId !== data.userId));
        }, 5000);
      } else {
        clearTimeout(typingTimers.current[data.userId]);
        setIsTyping(prev => prev.filter(t => t.userId !== data.userId));
      }
    };

    socket.on('group:message', onMessage);
    socket.on('group:typing', onTyping);
    return () => {
      socket.off('group:message', onMessage);
      socket.off('group:typing', onTyping);
    };
  }, [socket, group.id, currentUserId]);

  const emitTyping = useCallback((typing: boolean) => {
    if (!socket) return;
    socket.emit('group:typing', { groupId: group.id, isTyping: typing });
    isTypingRef.current = typing;
  }, [socket, group.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!isTypingRef.current) emitTyping(true);
    if (typingEmitTimer.current) clearTimeout(typingEmitTimer.current);
    typingEmitTimer.current = setTimeout(() => emitTyping(false), 3000);
  };

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!socket || !connected || !content) return;
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content,
      senderId: currentUserId,
      recipientId: group.id,
      direction: 'sent',
      status: 'sending' as Message['status'],
      timestamp: new Date(),
      type: 'text',
    };
    setMessages(prev => [...prev, tempMsg]);
    socket.emit('group:message', { groupId: group.id, content, type: 'text', tempId });
    setText('');
    if (typingEmitTimer.current) clearTimeout(typingEmitTimer.current);
    emitTyping(false);
    inputRef.current?.focus();
  }, [socket, connected, text, group.id, currentUserId, emitTyping]);

  const typingLabel = isTyping.length === 0
    ? ''
    : isTyping.length === 1
    ? `${isTyping[0].displayName} is typing…`
    : `${isTyping.map(t => t.displayName).join(', ')} are typing…`;

  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  return (
    <div className={styles.container}>
      <div className={styles.messageArea}>
        <ChatView
          messages={messages}
          isDark={isDark}
          messagesEndRef={messagesEndRef}
          isRecipientTyping={isTyping.length > 0}
          isRecipientRecording={false}
          recipientGhostText=""
          listeningMessageIds={listeningMessageIds}
          onImageClick={(url, name) => { setLightboxUrl(url); setLightboxName(name); }}
          onAudioPlayStatusChange={(id, _sid, playing) => setActiveAudioMessageId(playing ? id : null)}
          activeAudioMessageId={activeAudioMessageId}
          currentUserId={currentUserId}
          conversationStatus="accepted"
        />
      </div>

      <div className={styles.inputArea}>
        {typingLabel && <div className={styles.typingLabel}>{typingLabel}</div>}
        <div className={styles.inputRow} style={{ background: bg, borderTop: `1px solid ${border}` }}>
          <button className={styles.iconBtn} onClick={() => setEmojiOpen(v => !v)} aria-label="Emoji">
            <i className="far fa-face-smile" />
          </button>
          <input
            ref={inputRef}
            className={styles.textInput}
            value={text}
            onChange={handleTextChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message group…"
            style={{ background: 'transparent', color: isDark ? '#fff' : '#0f172a' }}
          />
          <button
            className={styles.sendBtn}
            style={{ background: text.trim() && connected ? 'var(--color-orange-500)' : '#64748b' }}
            onClick={handleSend}
            disabled={!text.trim() || !connected}
            aria-label="Send"
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
        {emojiOpen && (
          <EmojiPicker
            onSelect={emoji => { setText(prev => prev + emoji); setEmojiOpen(false); inputRef.current?.focus(); }}
            onClose={() => setEmojiOpen(false)}
            isDark={isDark}
          />
        )}
      </div>

      {lightboxUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt={lightboxName} className={styles.lightboxImg} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
