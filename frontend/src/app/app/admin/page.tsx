'use client';

import { useEffect, useState, useCallback } from 'react';
import { getApiBase } from '@/lib/api';
import styles from './admin.module.css';

interface WidgetContact {
  id: string;
  name: string;
  contactEmail: string | null;
  createdAt: string;
  hasConversation: boolean;
  totalMessages: number;
  firstMessage: { content: string; createdAt: string } | null;
}

interface MessageDetail {
  id: string;
  content: string;
  type: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  sender: { displayName: string; isGuest: boolean; isSupport: boolean };
}

export default function AdminPage() {
  const [contacts, setContacts] = useState<WidgetContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDetail[]>([]);
  const [guestInfo, setGuestInfo] = useState<{ displayName: string; contactEmail: string | null } | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/admin/widget-contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'Support access required' : 'Failed to load contacts');
      const data = await res.json();
      setContacts(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const loadMessages = async (guestId: string) => {
    if (!token) return;
    setSelectedGuest(guestId);
    setMessagesLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/widget-contacts/${guestId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.messages);
      setGuestInfo(data.guest);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const deleteGuest = async (guestId: string) => {
    if (!token || !confirm('Delete this contact and all their messages?')) return;
    await fetch(`${getApiBase()}/api/admin/widget-contacts/${guestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setContacts((prev) => prev.filter((c) => c.id !== guestId));
    if (selectedGuest === guestId) {
      setSelectedGuest(null);
      setMessages([]);
      setGuestInfo(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-lock" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><i className="fas fa-headset" /> Widget Contacts</h1>
        <span className={styles.count}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>Loading contacts…</div>
          ) : contacts.length === 0 ? (
            <div className={styles.empty}>No widget contacts yet</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className={`${styles.card} ${selectedGuest === c.id ? styles.selected : ''}`}
                onClick={() => loadMessages(c.id)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardName}>{c.name || 'Anonymous'}</div>
                  <div className={styles.cardDate}>{formatDate(c.createdAt)}</div>
                </div>
                {c.contactEmail && (
                  <div className={styles.cardEmail}>
                    <i className="fas fa-envelope" /> {c.contactEmail}
                  </div>
                )}
                <div className={styles.cardMeta}>
                  {c.hasConversation ? (
                    <span className={styles.badge}>{c.totalMessages} message{c.totalMessages !== 1 ? 's' : ''}</span>
                  ) : (
                    <span className={styles.badgeMuted}>No conversation</span>
                  )}
                </div>
                {c.firstMessage && (
                  <div className={styles.cardPreview}>{c.firstMessage.content}</div>
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); deleteGuest(c.id); }}
                  title="Delete contact"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.detail}>
          {!selectedGuest ? (
            <div className={styles.placeholder}>
              <i className="fas fa-comments" />
              <p>Select a contact to view their conversation</p>
            </div>
          ) : messagesLoading ? (
            <div className={styles.loading}>Loading messages…</div>
          ) : (
            <>
              {guestInfo && (
                <div className={styles.detailHeader}>
                  <h2>{guestInfo.displayName}</h2>
                  {guestInfo.contactEmail && (
                    <a href={`mailto:${guestInfo.contactEmail}`} className={styles.emailLink}>
                      <i className="fas fa-envelope" /> {guestInfo.contactEmail}
                    </a>
                  )}
                </div>
              )}
              <div className={styles.messageList}>
                {messages.length === 0 ? (
                  <div className={styles.empty}>No messages</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`${styles.msg} ${m.sender.isGuest ? styles.msgGuest : styles.msgAgent}`}
                    >
                      <div className={styles.msgSender}>{m.sender.displayName}</div>
                      <div className={styles.msgContent}>
                        {m.type === 'text' ? m.content : `[${m.type}] ${m.content || ''}`}
                      </div>
                      <div className={styles.msgTime}>{formatDate(m.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
