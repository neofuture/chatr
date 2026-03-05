'use client';

import { useState, useCallback, useEffect } from 'react';
import ChatView from '@/components/messaging/ChatView';
import MessageInput from '@/components/messaging/MessageInput/MessageInput';
import Lightbox from '@/components/Lightbox/Lightbox';
import { useConversationView } from '@/hooks/useConversationView';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { usePanels } from '@/contexts/PanelContext';
import { useFriends } from '@/hooks/useFriends';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { clearCachedConversation } from '@/lib/messageCache';
import BlockedUsersPanel from '@/components/settings/BlockedUsersPanel';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ConversationViewProps {
  recipientId: string;
  isDark: boolean;
  conversationId?: string;
  conversationStatus?: 'pending' | 'accepted';
  isInitiator?: boolean;
  onConversationAccepted?: () => void;
  isBlocked?: boolean;
  blockedByMe?: boolean;
}

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.id ?? '';
  } catch {
    return '';
  }
}

export default function ConversationView({
  recipientId,
  isDark,
  conversationId,
  conversationStatus,
  isInitiator,
  onConversationAccepted,
  isBlocked: initialBlocked = false,
  blockedByMe: initialBlockedByMe = false,
}: ConversationViewProps) {
  const [currentUserId] = useState<string>(getCurrentUserId);
  const [localStatus, setLocalStatus] = useState(conversationStatus);
  const [localConvoId, setLocalConvoId] = useState(conversationId);
  const [localIsInitiator, setLocalIsInitiator] = useState(isInitiator ?? false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [nuking, setNuking] = useState(false);
  const [blocked, setBlocked] = useState(initialBlockedByMe);
  const [iBlockedThem, setIBlockedThem] = useState(initialBlockedByMe);
  const { closePanel, openPanel } = usePanels();
  const openUserProfile = useOpenUserProfile();
  const { blockUser, unblockUser } = useFriends();
  const { showConfirmation } = useConfirmation();

  const {
    messages,
    messagesEndRef,
    activeAudioMessageId,
    listeningMessageIds,
    isRecipientTyping,
    isRecipientRecording,
    lightboxUrl,
    lightboxName,
    replyingTo,
    editingMessage,
    addMessage,
    handleEditSaved,
    editLastSentMessage,
    handleAudioPlayStatusChange,
    handleReaction,
    handleUnsend,
    openLightbox,
    closeLightbox,
    cancelReply,
    cancelEdit,
    setReplyingTo,
    setEditingMessage,
  } = useConversationView({ recipientId, currentUserId });

  // Pick up conversationId from the backend when the first message is sent/received
  const { socket } = useWebSocket();
  useEffect(() => {
    if (!socket || localConvoId) return;
    const onSent = (data: any) => {
      if (data.conversationId && data.recipientId === recipientId) {
        setLocalConvoId(data.conversationId);
        if (data.conversationStatus) setLocalStatus(data.conversationStatus);
        // We sent this message, so we are the initiator
        setLocalIsInitiator(true);
      }
    };
    const onReceived = (data: any) => {
      if (data.conversationId && data.senderId === recipientId) {
        setLocalConvoId(data.conversationId);
        if (data.conversationStatus) setLocalStatus(data.conversationStatus);
        // They sent the message to us, so we are NOT the initiator
        setLocalIsInitiator(false);
      }
    };
    socket.on('message:sent', onSent);
    socket.on('message:received', onReceived);
    return () => {
      socket.off('message:sent', onSent);
      socket.off('message:received', onReceived);
    };
  }, [socket, localConvoId, recipientId]);

  const [blockedReason, setBlockedReason] = useState(
    initialBlockedByMe ? 'You have blocked this user' : ''
  );

  // Proactively check block status on mount — only care if WE blocked them
  useEffect(() => {
    if (!recipientId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/api/friends/${recipientId}/block-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        // Only update UI state if WE are the blocker — never reveal to user that they are blocked
        if (data.blocked && data.blockedByMe && !cancelled) {
          setBlocked(true);
          setIBlockedThem(true);
          setBlockedReason('You have blocked this user');
        }
      } catch { /* network error — fail silently */ }
    })();
    return () => { cancelled = true; };
  }, [recipientId]);

  // Listen for block rejection when trying to send
  useEffect(() => {
    if (!socket) return;
    const onBlocked = (data: { recipientId: string; reason: string }) => {
      if (data.recipientId === recipientId) {
        setBlocked(true);
        setBlockedReason(data.reason);
      }
    };
    socket.on('message:blocked', onBlocked);
    return () => { socket.off('message:blocked', onBlocked); };
  }, [socket, recipientId]);

  const isIncomingRequest = localStatus === 'pending' && !localIsInitiator;

  const handleAccept = useCallback(async () => {
    if (!localConvoId) return;
    setAccepting(true);
    try {
      const token = localStorage.getItem('token');
      // If we blocked them, unblock first so the conversation can proceed
      if (iBlockedThem) {
        await unblockUser(recipientId);
        setBlocked(false);
        setIBlockedThem(false);
        setBlockedReason('');
      }
      const res = await fetch(`${API}/api/conversations/${localConvoId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLocalStatus('accepted');
        onConversationAccepted?.();
      }
    } catch (e) {
      console.error('Failed to accept conversation:', e);
    } finally {
      setAccepting(false);
    }
  }, [localConvoId, iBlockedThem, recipientId, unblockUser, onConversationAccepted]);

  const handleUnblockFromRequest = useCallback(async () => {
    setBlocking(true);
    try {
      await unblockUser(recipientId);
      setBlocked(false);
      setIBlockedThem(false);
      setBlockedReason('');
      onConversationAccepted?.();
    } catch (e) {
      console.error('Failed to unblock user:', e);
    } finally {
      setBlocking(false);
    }
  }, [recipientId, unblockUser, onConversationAccepted]);

  const handleDecline = useCallback(async () => {
    if (!localConvoId) return;
    setDeclining(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/conversations/${localConvoId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onConversationAccepted?.();
    } catch (e) {
      console.error('Failed to decline conversation:', e);
    } finally {
      setDeclining(false);
    }
  }, [localConvoId, onConversationAccepted]);

  const handleBlockFromRequest = useCallback(async () => {
    const confirmed = await showConfirmation({
      title: 'Block this user?',
      message: 'They will no longer be able to message you. You can manage blocked users in Settings.',
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Block', variant: 'destructive', value: true },
      ],
    });
    if (!confirmed) return;
    setBlocking(true);
    try {
      await blockUser(recipientId);
      setBlocked(true);
      setIBlockedThem(true);
      setBlockedReason('You have blocked this user');
      // Do NOT change localStatus — keep the bar visible so user can Accept/Deny/Unblock
      onConversationAccepted?.();
    } catch (e) {
      console.error('Failed to block user:', e);
    } finally {
      setBlocking(false);
    }
  }, [recipientId, blockUser, showConfirmation, onConversationAccepted]);


  const handleNuke = useCallback(async () => {
    if (!confirm('Nuke this conversation? All messages will be permanently deleted for both users.')) return;
    setNuking(true);
    try {
      const token = localStorage.getItem('token');
      const url = localConvoId
        ? `${API}/api/conversations/${localConvoId}/nuke`
        : `${API}/api/conversations/nuke-by-user/${recipientId}`;
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clear local IndexedDB cache for this conversation
      if (currentUserId) {
        await clearCachedConversation(currentUserId, recipientId);
      }

      // Refresh the conversation list
      onConversationAccepted?.();

      // Close the chat panel
      closePanel(`chat-${recipientId}`);
    } catch (e) {
      console.error('Failed to nuke conversation:', e);
    } finally {
      setNuking(false);
    }
  }, [localConvoId, recipientId, currentUserId, onConversationAccepted, closePanel]);

  // When user replies to a pending request, auto-accept locally
  const handleMessageSentWrapper = useCallback((msg: any) => {
    addMessage(msg);
    if (isIncomingRequest) {
      setLocalStatus('accepted');
      onConversationAccepted?.();
    }
  }, [addMessage, isIncomingRequest, onConversationAccepted]);

  if (!recipientId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#64748b' : '#94a3b8',
        fontSize: '14px',
      }}>
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Message list */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatView
          messages={messages}
          isDark={isDark}
          messagesEndRef={messagesEndRef}
          isRecipientTyping={isRecipientTyping}
          isRecipientRecording={isRecipientRecording}
          recipientGhostText=""
          listeningMessageIds={listeningMessageIds}
          onImageClick={openLightbox}
          onAudioPlayStatusChange={handleAudioPlayStatusChange}
          activeAudioMessageId={activeAudioMessageId}
          onReaction={handleReaction}
          onUnsend={handleUnsend}
          onReply={setReplyingTo}
          onEdit={setEditingMessage}
          currentUserId={currentUserId}
          onAvatarClick={(senderId, displayName, profileImage) => openUserProfile(senderId, displayName, profileImage)}
        />
      </div>

      {/* Accept/Decline bar for incoming message requests */}
      {isIncomingRequest && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
          borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}>
          <span style={{
            fontSize: '13px',
            color: isDark ? '#94a3b8' : '#64748b',
            flex: 1,
          }}>
            {iBlockedThem
              ? 'You have blocked this user — accept to unblock and reply, or:'
              : 'Message request — reply to accept, or:'}
          </span>
          {/* Accept */}
          <button
            onClick={handleAccept}
            disabled={accepting || blocking}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: 'none',
              backgroundColor: '#3b82f6', color: '#fff',
              fontSize: '13px', fontWeight: '600',
              cursor: accepting || blocking ? 'wait' : 'pointer',
              opacity: accepting || blocking ? 0.6 : 1,
            }}
          >
            {accepting ? 'Accepting...' : iBlockedThem ? 'Unblock & Accept' : 'Accept'}
          </button>
          {/* Deny */}
          <button
            onClick={handleDecline}
            disabled={declining || blocking}
            style={{
              padding: '6px 16px', borderRadius: '6px',
              border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              backgroundColor: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '13px', fontWeight: '600',
              cursor: declining || blocking ? 'wait' : 'pointer',
              opacity: declining || blocking ? 0.6 : 1,
            }}
          >
            {declining ? 'Declining...' : 'Deny'}
          </button>
          {/* Unblock / Block */}
          {iBlockedThem ? (
            <button
              onClick={handleUnblockFromRequest}
              disabled={blocking || accepting || declining}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                border: '1px solid #22c55e', backgroundColor: 'transparent',
                color: '#22c55e', fontSize: '13px', fontWeight: '600',
                cursor: blocking || accepting || declining ? 'wait' : 'pointer',
                opacity: blocking || accepting || declining ? 0.6 : 1,
              }}
            >
              {blocking ? 'Unblocking...' : 'Unblock'}
            </button>
          ) : (
            <button
              onClick={handleBlockFromRequest}
              disabled={blocking || accepting || declining}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                border: '1px solid #ef4444', backgroundColor: 'transparent',
                color: '#ef4444', fontSize: '13px', fontWeight: '600',
                cursor: blocking || accepting || declining ? 'wait' : 'pointer',
                opacity: blocking || accepting || declining ? 0.6 : 1,
              }}
            >
              {blocking ? 'Blocking...' : 'Block'}
            </button>
          )}
        </div>
      )}

      {/* Blocked footer alert — only shown when WE blocked them, never when they blocked us */}
      {blocked && iBlockedThem && !isIncomingRequest && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
          borderTop: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)'}`,
        }}>
          <i className="fas fa-ban" style={{ color: '#ef4444', fontSize: '13px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#ef4444', flex: 1 }}>
            You have blocked this user
          </span>
          <button
            onClick={() => openPanel('blocked-users', <BlockedUsersPanel />, 'Blocked Users', 'center', undefined, undefined, true)}
            style={{ fontSize: '12px', color: '#ef4444', opacity: 0.7, flexShrink: 0, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            Manage in Settings
          </button>
        </div>
      )}

      {/* Input — hidden only when WE blocked them */}
      {(!blocked || !iBlockedThem) && (
        <MessageInput
          isDark={isDark}
          recipientId={recipientId}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onMessageSent={handleMessageSentWrapper}
          onEditSaved={handleEditSaved}
          onCancelReply={cancelReply}
          onCancelEdit={cancelEdit}
          onEditLastSent={editLastSentMessage}
          conversationStatus={localStatus}
        />
      )}

      {/* Floating nuke button (testing utility) */}
      <button
        onClick={handleNuke}
        disabled={nuking}
        title="Delete conversation and all messages for both users"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isDark ? 'rgba(127,29,29,0.5)' : 'rgba(239,68,68,0.12)',
          color: '#ef4444',
          fontSize: '12px',
          cursor: nuking ? 'wait' : 'pointer',
          opacity: nuking ? 0.4 : 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.15s',
        }}
      >
        <i className={nuking ? 'fas fa-spinner fa-spin' : 'fas fa-radiation'} />
      </button>

      {/* Lightbox */}
      {lightboxUrl && (
        <Lightbox
          imageUrl={lightboxUrl}
          imageName={lightboxName}
          isOpen={!!lightboxUrl}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
