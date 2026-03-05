'use client';

import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { usePanels } from '@/contexts/PanelContext';

/**
 * Listens for incoming messages and shows a toast notification when
 * the sender's chat panel is not already open (or is closing).
 *
 * The toast is clickable and will trigger the provided onOpenConversation
 * callback so the caller can open the correct panel.
 */
export function useMessageToast(
  onOpenConversation: (senderId: string) => void,
  currentUserId: string | null,
) {
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const { panels } = usePanels();

  // Keep a ref so the socket handler always has fresh values without
  // needing to re-register the listener every render.
  const onOpenRef = useRef(onOpenConversation);
  const panelsRef = useRef(panels);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => { onOpenRef.current = onOpenConversation; }, [onOpenConversation]);
  useEffect(() => { panelsRef.current = panels; }, [panels]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    if (!socket) return;

    const onReceived = (data: any) => {
      const senderId: string = data.senderId;

      // Don't toast for our own messages
      if (senderId === currentUserIdRef.current) return;

      // Don't toast if the sender's chat panel is already open and not closing
      const panelId = `chat-${senderId}`;
      const isOpen = panelsRef.current.some(p => p.id === panelId && !p.isClosing);
      if (isOpen) return;

      const senderName: string = data.senderName || data.senderDisplayName || 'Someone';

      // Build a preview of the message content
      let preview: string;
      switch (data.type) {
        case 'audio':   preview = '🎤 Voice message'; break;
        case 'image':   preview = '📷 Image'; break;
        case 'video':   preview = '🎬 Video'; break;
        case 'file':    preview = `📎 ${data.fileName || 'File'}`; break;
        default:        preview = data.content || 'New message'; break;
      }
      // Truncate long previews
      if (preview.length > 60) preview = preview.slice(0, 57) + '…';

      const isRequest = data.conversationStatus === 'pending';
      showToast(
        preview,
        'newmessage',
        6000,
        () => onOpenRef.current(senderId),
        undefined,
        isRequest ? `Message Request from ${senderName}` : senderName,
      );
    };

    socket.on('message:received', onReceived);
    return () => { socket.off('message:received', onReceived); };
  }, [socket, showToast]);
}

