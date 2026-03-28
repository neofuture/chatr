'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [guestInfo, setGuestInfo] = useState<{ displayName: string; contactEmail: string | null; widgetContext?: Record<string, any> | null } | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(240);
  const dragging = useRef(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setListWidth(Math.max(180, Math.min(x, rect.width - 200)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/admin/widget-contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('Support access required');
        return;
      }
      if (!res.ok) {
        setContacts([]);
        return;
      }
      const data = await res.json();
      setContacts(data);
      setError(null);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchContacts();
  }, [token, fetchContacts]);

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

  const sendReply = async () => {
    if (!token || !selectedGuest || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/widget-contacts/${selectedGuest}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch { /* ignore */ } finally {
      setSending(false);
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

  if (!loading && contacts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <i className="fas fa-inbox" />
          <p className={styles.emptyTitle}>No widget contacts yet</p>
          <p className={styles.emptySubtitle}>Contacts will appear here when visitors use the chat widget</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout} ref={layoutRef}>
        <div className={styles.list} style={{ width: listWidth, minWidth: listWidth, maxWidth: listWidth }}>
          {loading ? (
            <div className={styles.loading}>Loading contacts…</div>
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

        <div className={styles.divider} onMouseDown={handleMouseDown} />

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
              <div className={styles.detailHeader}>
                <button
                  className={styles.backBtn}
                  onClick={() => { setSelectedGuest(null); setMessages([]); setGuestInfo(null); }}
                >
                  <i className="fas fa-arrow-left" />
                </button>
                <div>
                  {guestInfo && (
                    <>
                      <h2>{guestInfo.displayName}</h2>
                      {guestInfo.contactEmail && (
                        <a href={`mailto:${guestInfo.contactEmail}`} className={styles.emailLink}>
                          <i className="fas fa-envelope" /> {guestInfo.contactEmail}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
              {guestInfo?.widgetContext && (
                <div className={styles.contextBar}>
                  {guestInfo.widgetContext.pageUrl && (
                    <div className={styles.contextItem}>
                      <i className="fas fa-link" />
                      <a href={guestInfo.widgetContext.pageUrl as string} target="_blank" rel="noopener noreferrer">
                        {(guestInfo.widgetContext.pageTitle as string) || (guestInfo.widgetContext.pageUrl as string)}
                      </a>
                    </div>
                  )}
                  {guestInfo.widgetContext.referrer && (
                    <div className={styles.contextItem}>
                      <i className="fas fa-arrow-right-to-bracket" />
                      <span>{guestInfo.widgetContext.referrer as string}</span>
                    </div>
                  )}
                  <div className={styles.contextRow}>
                    {guestInfo.widgetContext.language && (
                      <span className={styles.contextTag}>
                        <i className="fas fa-globe" /> {guestInfo.widgetContext.language as string}
                      </span>
                    )}
                    {guestInfo.widgetContext.timezone && (
                      <span className={styles.contextTag}>
                        <i className="fas fa-clock" /> {guestInfo.widgetContext.timezone as string}
                      </span>
                    )}
                    {guestInfo.widgetContext.screenWidth && (
                      <span className={styles.contextTag}>
                        <i className="fas fa-display" /> {guestInfo.widgetContext.screenWidth as string}x{guestInfo.widgetContext.screenHeight as string}
                      </span>
                    )}
                  </div>
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
                <div ref={messagesEndRef} />
              </div>
              <div className={styles.replyBar}>
                <input
                  type="text"
                  className={styles.replyInput}
                  placeholder="Type a reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  disabled={sending}
                />
                <button
                  className={styles.replyBtn}
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  title="Send reply"
                >
                  <i className="fas fa-paper-plane" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
