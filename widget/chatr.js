/**
 * Chatr Support Widget
 * Drop-in embeddable chat widget — connects visitors to the Chatr support agent.
 *
 * Usage:
 *   <script src="https://api.chatr-app.online/widget/chatr.js"></script>
 *
 * Optional config (set before the script tag):
 *   window.ChatrWidgetConfig = {
 *     apiUrl: 'https://api.chatr-app.online',  // override API base URL
 *     accentColor: '#f97316',                  // override accent colour
 *     greeting: 'Hi! How can we help you?',    // override greeting text
 *     title: 'Support Chat',                   // override chat header title
 *     devMode: true,                           // always start fresh (no session persistence)
 *   };
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var cfg = window.ChatrWidgetConfig || {};

  // Auto-detect API URL from the script's own src if not explicitly set.
  // e.g. <script src="http://localhost:3001/widget/chatr.js"> → API_URL = http://localhost:3001
  //      <script src="https://api.chatr-app.online/widget/chatr.js"> → API_URL = https://api.chatr-app.online
  function detectApiUrl() {
    if (cfg.apiUrl) return cfg.apiUrl.replace(/\/$/, '');
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('/widget/chatr.js') !== -1) {
        var m = src.match(/^(https?:\/\/[^/]+)/);
        if (m) return m[1];
      }
    }
    return window.location.protocol + '//' + window.location.host;
  }

  var API_URL = detectApiUrl();
  var ACCENT   = cfg.accentColor || '#f97316';
  var TITLE    = cfg.title       || 'Support Chat';
  var GREETING = cfg.greeting    || 'Hi there 👋 How can we help you today?';

  // devMode: only active when explicitly set via config (devMode: true).
  // Sessions are ALWAYS persisted in localStorage unless devMode is on.
  // Do NOT auto-detect localhost — the demo page and local testing should still
  // retain sessions across refreshes just like production.
  var DEV_MODE = !!cfg.devMode;

  var SESSION_KEY = 'chatr_widget_session';
  var SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // ── Session storage helpers ──────────────────────────────────────────────────
  // Dev mode: use sessionStorage (cleared when tab closes, but we also clear on init).
  // Production: use localStorage (persists for 24 hours then expires automatically).
  var store = (function () {
    var s = DEV_MODE ? sessionStorage : localStorage;
    return {
      get: function () {
        try {
          var raw = s.getItem(SESSION_KEY);
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          // Expire sessions older than 24 h
          if (parsed && parsed.expiresAt && Date.now() > parsed.expiresAt) {
            s.removeItem(SESSION_KEY);
            return null;
          }
          return parsed;
        } catch (e) { return null; }
      },
      set: function (val) {
        try {
          s.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, val, {
            expiresAt: Date.now() + SESSION_TTL_MS,
          })));
        } catch (e) { /* ignore */ }
      },
      clear: function () {
        try { s.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      },
    };
  }());

  // Prevent double-init
  if (window.__chatrWidgetLoaded) return;
  window.__chatrWidgetLoaded = true;

  // In devMode always start fresh — clear any lingering session from previous runs
  if (DEV_MODE) store.clear();

  // ── State ────────────────────────────────────────────────────────────────────
  var state = {
    open: false,
    phase: 'intro',   // 'intro' | 'chat'
    socket: null,
    token: null,
    guestId: null,
    guestName: null,
    supportAgentId: null,
    supportName: 'Support',
    supportAvatar: null,
    conversationId: null,
    messages: [],
    unread: 0,
    agentTyping: false,
  };

  // ── Restore session (production only — devMode always starts fresh) ──────────
  if (!DEV_MODE) {
    var saved = store.get();
    if (saved && saved.guestId && saved.token) {
      state.guestId   = saved.guestId;
      state.token     = saved.token;
      state.guestName = saved.guestName;
      state.messages  = saved.messages || [];
      state.phase     = 'chat';
    }
  }

  // ── Inject styles ────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#chatr-widget-btn{',
      'position:fixed;bottom:24px;right:24px;z-index:2147483647;',
      'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
      'background:' + ACCENT + ';color:#fff;font-size:24px;',
      'box-shadow:0 4px 16px rgba(0,0,0,.3);',
      'display:flex;align-items:center;justify-content:center;',
      'transition:transform .2s,box-shadow .2s;',
    '}',
    '#chatr-widget-btn:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(0,0,0,.4)}',
    '#chatr-widget-badge{',
      'position:absolute;top:-4px;right:-4px;',
      'background:#ef4444;color:#fff;font-size:11px;font-weight:700;',
      'border-radius:10px;min-width:18px;height:18px;',
      'display:flex;align-items:center;justify-content:center;padding:0 4px;',
      'font-family:sans-serif;',
    '}',
    '#chatr-widget-panel{',
      'position:fixed;bottom:92px;right:24px;z-index:2147483646;',
      'width:360px;max-width:calc(100vw - 48px);',
      'height:520px;max-height:calc(100vh - 120px);',
      'background:#0f172a;border-radius:16px;',
      'box-shadow:0 8px 40px rgba(0,0,0,.5);',
      'display:flex;flex-direction:column;overflow:hidden;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'border:1px solid rgba(255,255,255,.08);',
      'opacity:0;transform:translateY(12px) scale(.97);',
      'transition:opacity .25s,transform .25s;pointer-events:none;',
    '}',
    '#chatr-widget-panel.open{opacity:1;transform:none;pointer-events:all}',
    /* Header */
    '#chatr-w-header{',
      'background:linear-gradient(135deg,' + ACCENT + ',#dc2626);',
      'padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;',
    '}',
    '#chatr-w-header-avatar{',
      'width:42px;height:42px;border-radius:50%;object-fit:cover;',
      'border:2px solid rgba(255,255,255,.4);flex-shrink:0;',
      'background:rgba(255,255,255,.2);display:flex;align-items:center;',
      'justify-content:center;font-size:18px;color:#fff;font-weight:700;',
      'overflow:hidden;',
    '}',
    '#chatr-w-header-info{flex:1;min-width:0}',
    '#chatr-w-header-name{color:#fff;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#chatr-w-header-status{color:rgba(255,255,255,.75);font-size:12px;display:flex;align-items:center;gap:4px}',
    '.chatr-status-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0}',
    '#chatr-w-close{',
      'background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;',
      'font-size:20px;padding:4px;line-height:1;flex-shrink:0;',
    '}',
    '#chatr-w-close:hover{color:#fff}',
    '#chatr-w-end-btn{',
      'background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.25);',
      'color:rgba(255,255,255,.9);cursor:pointer;font-size:11px;font-weight:600;',
      'font-family:inherit;letter-spacing:.4px;text-transform:uppercase;',
      'border-radius:20px;padding:4px 12px;flex-shrink:0;',
      'transition:background .2s,border-color .2s,color .2s;white-space:nowrap;',
    '}',
    '#chatr-w-end-btn:hover{background:rgba(220,38,38,.7);border-color:rgba(220,38,38,.8);color:#fff}',
    /* Body */
    '#chatr-w-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}',
    '#chatr-w-body::-webkit-scrollbar{width:4px}',
    '#chatr-w-body::-webkit-scrollbar-track{background:transparent}',
    '#chatr-w-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}',
    /* Intro phase */
    '#chatr-w-intro{display:flex;flex-direction:column;gap:16px;padding:8px 0}',
    '#chatr-w-greeting{',
      'background:rgba(255,255,255,.06);border-radius:12px;padding:14px;',
      'color:#e2e8f0;font-size:14px;line-height:1.5;',
    '}',
    '.chatr-field{display:flex;flex-direction:column;gap:6px}',
    '.chatr-label{color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}',
    '.chatr-input{',
      'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);',
      'border-radius:8px;padding:10px 12px;color:#f1f5f9;font-size:14px;',
      'outline:none;transition:border-color .2s;width:100%;box-sizing:border-box;',
      'font-family:inherit;resize:none;',
    '}',
    '.chatr-input:focus{border-color:' + ACCENT + '}',
    '.chatr-input::placeholder{color:#64748b}',
    '.chatr-btn{',
      'background:' + ACCENT + ';color:#fff;border:none;border-radius:8px;',
      'padding:11px;font-size:14px;font-weight:600;cursor:pointer;',
      'transition:opacity .2s;font-family:inherit;',
    '}',
    '.chatr-btn:hover{opacity:.9}',
    '.chatr-btn:disabled{opacity:.5;cursor:not-allowed}',
    /* Chat phase */
    '.chatr-msg{display:flex;gap:8px;max-width:88%}',
    '.chatr-msg.sent{align-self:flex-end;flex-direction:row-reverse}',
    '.chatr-msg.recv{align-self:flex-start}',
    '.chatr-msg-avatar{',
      'width:28px;height:28px;border-radius:50%;flex-shrink:0;',
      'background:linear-gradient(135deg,' + ACCENT + ',#dc2626);',
      'display:flex;align-items:center;justify-content:center;',
      'color:#fff;font-size:11px;font-weight:700;overflow:hidden;',
      'align-self:flex-end;',
    '}',
    '.chatr-msg-bubble{',
      'padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;',
      'max-width:100%;word-wrap:break-word;',
    '}',
    '.chatr-msg.sent .chatr-msg-bubble{background:' + ACCENT + ';color:#fff;border-bottom-right-radius:4px}',
    '.chatr-msg.recv .chatr-msg-bubble{background:rgba(255,255,255,.1);color:#e2e8f0;border-bottom-left-radius:4px}',
    '.chatr-msg-time{font-size:10px;color:#64748b;margin-top:3px;text-align:right}',
    '.chatr-msg.recv .chatr-msg-time{text-align:left}',
    '.chatr-typing{display:flex;align-items:center;gap:4px;padding:10px 12px;',
      'background:rgba(255,255,255,.1);border-radius:14px;border-bottom-left-radius:4px;',
      'align-self:flex-start;',
    '}',
    '.chatr-typing span{width:6px;height:6px;border-radius:50%;background:#94a3b8;',
      'animation:chatr-bounce .9s infinite;display:inline-block}',
    '.chatr-typing span:nth-child(2){animation-delay:.2s}',
    '.chatr-typing span:nth-child(3){animation-delay:.4s}',
    '@keyframes chatr-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',
    /* Footer / input */
    '#chatr-w-footer{',
      'padding:12px;border-top:1px solid rgba(255,255,255,.07);',
      'display:flex;gap:8px;align-items:flex-end;flex-shrink:0;',
    '}',
    '#chatr-w-input{',
      'flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);',
      'border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:14px;',
      'outline:none;resize:none;max-height:100px;overflow-y:auto;',
      'font-family:inherit;line-height:1.4;transition:border-color .2s;',
    '}',
    '#chatr-w-input:focus{border-color:' + ACCENT + '}',
    '#chatr-w-input::placeholder{color:#64748b}',
    '#chatr-w-send{',
      'width:38px;height:38px;background:' + ACCENT + ';border:none;border-radius:10px;',
      'cursor:pointer;display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;transition:opacity .2s;',
    '}',
    '#chatr-w-send:hover{opacity:.9}',
    '#chatr-w-send:disabled{opacity:.4;cursor:not-allowed}',
    '#chatr-w-send svg{width:18px;height:18px;fill:#fff}',
    /* Error / offline */
    '.chatr-system-msg{',
      'text-align:center;color:#64748b;font-size:12px;padding:4px 0;',
    '}',
    /* Powered by */
    '#chatr-w-powered{',
      'text-align:center;font-size:10px;color:#334155;padding:4px 0 8px;flex-shrink:0;',
    '}',
    '#chatr-w-powered a{color:#475569;text-decoration:none}',
    '#chatr-w-powered a:hover{color:#64748b}',
  ].join('');
  document.head.appendChild(style);

  // ── Build DOM ────────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'chatr-widget-btn';
  btn.setAttribute('aria-label', 'Open support chat');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  var badge = document.createElement('span');
  badge.id = 'chatr-widget-badge';
  badge.style.display = 'none';
  btn.appendChild(badge);

  var panel = document.createElement('div');
  panel.id = 'chatr-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', TITLE);
  panel.innerHTML = [
    '<div id="chatr-w-header">',
      '<div id="chatr-w-header-avatar" aria-hidden="true"></div>',
      '<div id="chatr-w-header-info">',
        '<div id="chatr-w-header-name">' + escHtml(TITLE) + '</div>',
        '<div id="chatr-w-header-status"><span class="chatr-status-dot"></span><span id="chatr-w-status-text">Loading…</span></div>',
      '</div>',
      '<button id="chatr-w-end-btn" style="display:none" aria-label="End chat">End Chat</button>',
      '<button id="chatr-w-close" aria-label="Close chat">×</button>',
    '</div>',
    '<div id="chatr-w-body" role="log" aria-live="polite"></div>',
    '<div id="chatr-w-footer" style="display:none">',
      '<textarea id="chatr-w-input" placeholder="Type a message…" rows="1" aria-label="Message input"></textarea>',
      '<button id="chatr-w-send" aria-label="Send message">',
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
      '</button>',
    '</div>',
    '<div id="chatr-w-powered"><a href="https://chatr-app.online" target="_blank" rel="noopener">Powered by Chatr</a></div>',
  ].join('');

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // Element refs
  var elBody       = document.getElementById('chatr-w-body');
  var elFooter     = document.getElementById('chatr-w-footer');
  var elInput      = document.getElementById('chatr-w-input');
  var elSend       = document.getElementById('chatr-w-send');
  var elAvatar     = document.getElementById('chatr-w-header-avatar');
  var elName       = document.getElementById('chatr-w-header-name');
  var elStatusTxt  = document.getElementById('chatr-w-status-text');
  var elClose      = document.getElementById('chatr-w-close');
  var elEndBtn     = document.getElementById('chatr-w-end-btn');

  // ── Utility helpers ──────────────────────────────────────────────────────────
  function firstName(name) {
    if (!name) return '';
    return name.trim().split(/\s+/)[0];
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatTime(d) {
    d = d ? new Date(d) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollBottom() {
    elBody.scrollTop = elBody.scrollHeight;
  }

  function persistMessages() {
    if (DEV_MODE) return;
    store.set({
      guestId:   state.guestId,
      token:     state.token,
      guestName: state.guestName,
      messages:  state.messages.slice(-100), // keep last 100
    });
  }

  function updateBadge() {
    if (state.unread > 0 && !state.open) {
      badge.textContent = state.unread > 9 ? '9+' : state.unread;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function buildAvatarUrl(imgSrc) {
    if (!imgSrc) return null;
    // Already a full URL
    if (/^https?:\/\//.test(imgSrc)) return imgSrc;
    // Relative path — prefix with API_URL
    return API_URL + '/' + imgSrc.replace(/^\//, '');
  }

  function setAvatarContent(imgSrc, name) {
    var url = buildAvatarUrl(imgSrc);
    if (url) {
      var img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.onerror = function () { setAvatarContent(null, name); };
      elAvatar.innerHTML = '';
      elAvatar.appendChild(img);
    } else {
      var initials = (name || 'S').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      elAvatar.innerHTML = '';
      elAvatar.textContent = initials;
    }
  }

  // ── Render intro form ────────────────────────────────────────────────────────
  function renderIntro() {
    elEndBtn.style.display = 'none';
    elBody.innerHTML = [
      '<div id="chatr-w-intro">',
        '<div id="chatr-w-greeting">' + escHtml(GREETING) + '</div>',
        '<div class="chatr-field">',
          '<label class="chatr-label" for="chatr-w-name-input">Your first name</label>',
          '<input class="chatr-input" id="chatr-w-name-input" type="text" placeholder="What should we call you?" autocomplete="given-name" maxlength="60"/>',
        '</div>',
        '<div class="chatr-field">',
          '<label class="chatr-label" for="chatr-w-first-msg">What can we help with?</label>',
          '<textarea class="chatr-input" id="chatr-w-first-msg" placeholder="Tell us what\'s on your mind…" rows="3" maxlength="1000"></textarea>',
        '</div>',
        '<button class="chatr-btn" id="chatr-w-start-btn">Start Chat →</button>',
      '</div>',
    ].join('');

    var nameInput = document.getElementById('chatr-w-name-input');
    var msgInput  = document.getElementById('chatr-w-first-msg');
    var startBtn  = document.getElementById('chatr-w-start-btn');

    function tryStart() {
      var name = nameInput.value.trim();
      var msg  = msgInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      if (!msg)  { msgInput.focus();  return; }
      startBtn.disabled = true;
      startBtn.textContent = 'Connecting…';
      startSession(name, msg);
    }

    startBtn.addEventListener('click', tryStart);
    msgInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tryStart(); }
    });

    if (nameInput) nameInput.focus();
  }

  // ── Render a single message bubble ──────────────────────────────────────────
  function renderMessage(msg) {
    var isSent = msg.senderId === state.guestId;
    var wrap = document.createElement('div');
    wrap.className = 'chatr-msg ' + (isSent ? 'sent' : 'recv');
    wrap.setAttribute('data-msg-id', msg.id || '');

    var avatarHtml = '';
    if (!isSent) {
      var initials = (state.supportName || 'S').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      var avatarUrl = buildAvatarUrl(state.supportAvatar);
      if (avatarUrl) {
        avatarHtml = '<div class="chatr-msg-avatar" aria-hidden="true"><img src="' + avatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentNode.innerHTML=\'' + initials + '\'"/></div>';
      } else {
        avatarHtml = '<div class="chatr-msg-avatar" aria-hidden="true">' + initials + '</div>';
      }
    }

    wrap.innerHTML = avatarHtml + [
      '<div style="display:flex;flex-direction:column">',
        '<div class="chatr-msg-bubble">' + escHtml(msg.content) + '</div>',
        '<div class="chatr-msg-time">' + formatTime(msg.createdAt || msg.timestamp) + '</div>',
      '</div>',
    ].join('');

    // Remove any existing typing indicator before appending
    var typingEl = document.getElementById('chatr-w-typing');
    if (typingEl) elBody.removeChild(typingEl);

    elBody.appendChild(wrap);

    // Re-add typing indicator after message if it was there
    if (state.agentTyping) showTyping();

    scrollBottom();
  }

  function showTyping() {
    if (document.getElementById('chatr-w-typing')) return;
    var el = document.createElement('div');
    el.id = 'chatr-w-typing';
    el.className = 'chatr-msg recv';

    // Avatar beside the typing dots (same as recv messages)
    var initials = (state.supportName || 'S').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    var avatarUrl = buildAvatarUrl(state.supportAvatar);
    var avatarHtml = avatarUrl
      ? '<div class="chatr-msg-avatar" aria-hidden="true"><img src="' + avatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentNode.innerHTML=\'' + initials + '\'"/></div>'
      : '<div class="chatr-msg-avatar" aria-hidden="true">' + initials + '</div>';

    el.innerHTML = avatarHtml + '<div class="chatr-typing"><span></span><span></span><span></span></div>';
    elBody.appendChild(el);
    scrollBottom();
  }

  function hideTyping() {
    var el = document.getElementById('chatr-w-typing');
    if (el) elBody.removeChild(el);
  }

  function showSystemMsg(text) {
    var el = document.createElement('div');
    el.className = 'chatr-system-msg';
    el.textContent = text;
    elBody.appendChild(el);
    scrollBottom();
  }

  // ── Start a session: get guest JWT then connect socket ───────────────────────
  function startSession(name, firstMessage) {
    fetch(API_URL + '/api/widget/guest-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName: name, guestId: state.guestId }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);

      state.token          = data.token;
      state.guestId        = data.guestId;
      state.guestName      = data.guestName || name;
      state.supportAgentId = data.supportAgentId;
      state.phase          = 'chat';

      // Persist session (localStorage in production, not persisted in devMode)
      if (!DEV_MODE) {
        store.set({
          guestId: state.guestId,
          token: state.token,
          guestName: state.guestName,
          messages: [],
        });
      }

      renderChatPhase();
      loadSocketIO(function () {
        connectSocket(firstMessage);
      });
    })
    .catch(function (err) {
      console.error('[Chatr Widget] session error', err);
      var startBtn = document.getElementById('chatr-w-start-btn');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Chat';
      }
      showSystemMsg('Could not connect. Please try again.');
    });
  }

  // ── Render chat phase layout ─────────────────────────────────────────────────
  function renderChatPhase(isResume) {
    elBody.innerHTML = '';
    elFooter.style.display = 'flex';
    elEndBtn.style.display = 'block';

    if (!isResume) {
      showSystemMsg('Hi ' + firstName(state.guestName) + '! You\'re now connected with ' + firstName(state.supportName) + '. We\'ll be right with you 😊');
    }

    // Show any cached messages
    if (state.messages.length) {
      state.messages.forEach(renderMessage);
    } else if (isResume && state.token) {
      fetchHistory();
    }

    // Deduplicate listeners by cloning elements
    var newInput = elInput.cloneNode(true);
    elInput.parentNode.replaceChild(newInput, elInput);
    elInput = newInput;
    var newSend = elSend.cloneNode(true);
    elSend.parentNode.replaceChild(newSend, elSend);
    elSend = newSend;

    elInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    elInput.addEventListener('input', function () {
      elInput.style.height = 'auto';
      elInput.style.height = Math.min(elInput.scrollHeight, 100) + 'px';
      if (state.socket && state.supportAgentId) {
        state.socket.emit('typing:start', { recipientId: state.supportAgentId });
        clearTimeout(state._typingTimer);
        state._typingTimer = setTimeout(function () {
          if (state.socket) state.socket.emit('typing:stop', { recipientId: state.supportAgentId });
        }, 2000);
      }
    });
    elSend.addEventListener('click', sendMessage);
    setTimeout(function () { elInput.focus(); }, 100);
  }

  // ── Fetch message history when resuming a session ────────────────────────────
  function fetchHistory() {
    fetch(API_URL + '/api/widget/history', {
      headers: { 'Authorization': 'Bearer ' + state.token },
    })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.messages || !data.messages.length) return;
      state.messages = data.messages;
      elBody.innerHTML = '';
      state.messages.forEach(renderMessage);
    })
    .catch(function () {});
  }

  // ── Send a message ───────────────────────────────────────────────────────────
  function sendMessage() {
    var content = elInput.value.trim();
    if (!content || !state.socket || !state.supportAgentId) return;

    elInput.value = '';
    elInput.style.height = 'auto';
    elSend.disabled = false;

    state.socket.emit('typing:stop', { recipientId: state.supportAgentId });

    var tempMsg = {
      id: 'temp_' + Date.now(),
      senderId: state.guestId,
      content: content,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(tempMsg);
    renderMessage(tempMsg);
    persistMessages();

    state.socket.emit('message:send', {
      recipientId: state.supportAgentId,
      content: content,
      type: 'text',
    });
  }

  // ── Load Socket.IO client from CDN ───────────────────────────────────────────
  function loadSocketIO(callback) {
    if (window.io) { callback(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    s.onload = callback;
    s.onerror = function () {
      showSystemMsg('Failed to load chat library. Please refresh the page.');
    };
    document.head.appendChild(s);
  }

  // ── Connect Socket.IO ────────────────────────────────────────────────────────
  function connectSocket(firstMessage) {
    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }

    elStatusTxt.textContent = 'Connecting…';

    state.socket = window.io(API_URL, {
      auth: { token: state.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    state.socket.on('connect', function () {
      elStatusTxt.textContent = 'Online';
      // Don't send firstMessage here — wait for socket:ready which fires after
      // the server has finished its async setup and registered all event handlers.
      // Sending on 'connect' races with the server's connection handler.
    });

    // Server signals it has completed async setup and is ready to receive messages
    state.socket.on('socket:ready', function () {
      elStatusTxt.textContent = 'Online';
      if (firstMessage) {
        var msg = firstMessage;
        firstMessage = null;
        state.socket.emit('message:send', {
          recipientId: state.supportAgentId,
          content: msg,
          type: 'text',
        });
        var tempMsg = {
          id: 'temp_first_' + Date.now(),
          senderId: state.guestId,
          content: msg,
          createdAt: new Date().toISOString(),
        };
        state.messages.push(tempMsg);
        renderMessage(tempMsg);
        persistMessages();
      }
    });

    state.socket.on('disconnect', function () {
      elStatusTxt.textContent = 'Reconnecting…';
    });

    state.socket.on('connect_error', function (err) {
      elStatusTxt.textContent = 'Connection error';
      console.error('[Chatr Widget] connect error', err.message);
    });

    // Incoming message from support agent
    state.socket.on('message:received', function (data) {
      // Only show messages from the support agent
      if (data.senderId !== state.supportAgentId) return;

      hideTyping();
      state.agentTyping = false;

      var msg = {
        id: data.id || data.messageId,
        senderId: data.senderId,
        content: data.content,
        createdAt: data.timestamp || data.createdAt || new Date().toISOString(),
      };

      state.messages.push(msg);
      renderMessage(msg);
      persistMessages();

      if (!state.open) {
        state.unread++;
        updateBadge();
      }

      // Mark as read if panel is open
      if (state.open && state.socket) {
        state.socket.emit('message:read', { messageId: msg.id, senderId: state.supportAgentId });
      }
    });

    // Message confirmed sent (server echo)
    state.socket.on('message:sent', function (data) {
      // Replace temp message with confirmed one
      var tempEl = elBody.querySelector('[data-msg-id^="temp_"]');
      if (tempEl) tempEl.setAttribute('data-msg-id', data.id || '');
    });

    // Typing indicator from support agent — server emits typing:status with { userId, isTyping }
    state.socket.on('typing:status', function (data) {
      if (data.userId !== state.supportAgentId) return;
      if (data.isTyping) {
        state.agentTyping = true;
        showTyping();
      } else {
        state.agentTyping = false;
        hideTyping();
      }
    });

    // Legacy event names — kept for compatibility
    state.socket.on('typing:start', function (data) {
      if (data.userId !== state.supportAgentId) return;
      state.agentTyping = true;
      showTyping();
    });

    state.socket.on('typing:stop', function (data) {
      if (data.userId !== state.supportAgentId) return;
      state.agentTyping = false;
      hideTyping();
    });

    // Presence updates
    state.socket.on('user:status', function (data) {
      if (data.userId !== state.supportAgentId) return;
      elStatusTxt.textContent = data.status === 'online' ? 'Online' : firstName(state.supportName) + ' will reply soon';
      var dot = document.querySelector('.chatr-status-dot');
      if (dot) dot.style.background = data.status === 'online' ? '#4ade80' : '#94a3b8';
    });
  }

  // ── End chat (guest explicitly leaves) ──────────────────────────────────────
  function endChat() {
    // Notify backend so support agent sees the "left" message
    if (state.token) {
      fetch(API_URL + '/api/widget/end-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.token,
        },
      }).catch(function () { /* best-effort */ });
    }

    // Disconnect socket
    if (state.socket) {
      try { state.socket.emit('typing:stop', { recipientId: state.supportAgentId }); } catch (e) { /* ignore */ }
      state.socket.disconnect();
      state.socket = null;
    }

    // Clear persisted session
    store.clear();

    // Save name before resetting state so farewell message is correct
    var farewellName = firstName(state.guestName);

    // Reset state
    state.phase          = 'intro';
    state.token          = null;
    state.guestId        = null;
    state.guestName      = null;
    state.conversationId = null;
    state.messages       = [];
    state.agentTyping    = false;

    // Reset UI
    elEndBtn.style.display = 'none';
    elFooter.style.display = 'none';

    // Show a farewell message then reset to intro after a short delay
    elBody.innerHTML = '';
    showSystemMsg(farewellName
      ? 'Thanks for chatting, ' + farewellName + '! Have a great day 👋'
      : 'Thanks for chatting! Have a great day 👋');
    setTimeout(function () {
      elBody.innerHTML = '';
      renderIntro();
    }, 2500);
  }

  // ── Toggle panel open/closed ─────────────────────────────────────────────────
  function openPanel() {
    state.open = true;
    state.unread = 0;
    updateBadge();
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');

    if (state.phase === 'intro') {
      fetchSupportAgent(function () {
        renderIntro();
      });
    } else if (state.phase === 'chat') {
      // Render the chat UI (footer, input, history)
      // isResume=true suppresses the welcome banner and loads history
      renderChatPhase(true);
      // Connect socket only if not already connected from auto-init
      if (!state.socket) {
        loadSocketIO(function () {
          connectSocket(null);
        });
      }
    }
  }

  function closePanel() {
    state.open = false;
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    if (state.socket) {
      state.socket.emit('typing:stop', { recipientId: state.supportAgentId });
    }
  }

  // ── Fetch support agent info ─────────────────────────────────────────────────
  function fetchSupportAgent(cb) {
    fetch(API_URL + '/api/widget/support-agent')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.id) {
          state.supportAgentId = data.id;
          state.supportName    = data.displayName || data.username || 'Support';
          state.supportAvatar  = data.profileImage || null;
          elName.textContent   = firstName(state.supportName);
          setAvatarContent(state.supportAvatar, state.supportName);
          elStatusTxt.textContent = 'Online';
        } else {
          elStatusTxt.textContent = 'Away';
        }
        if (cb) cb();
      })
      .catch(function () {
        elStatusTxt.textContent = 'Away';
        if (cb) cb();
      });
  }

  // ── Event listeners ──────────────────────────────────────────────────────────
  btn.addEventListener('click', function () {
    if (state.open) closePanel(); else openPanel();
  });

  elClose.addEventListener('click', closePanel);

  elEndBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to end this chat?')) {
      endChat();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.open) closePanel();
  });

  // ── Auto-init if session exists ──────────────────────────────────────────────
  if (state.phase === 'chat' && state.guestId) {
    // Restored session — fetch agent info for the header, then silently reconnect
    // socket so the badge updates if a message arrives while panel is closed
    fetchSupportAgent(function () {
      loadSocketIO(function () {
        connectSocket(null);
      });
    });
  } else {
    // No session — pre-fetch agent info silently so first open is fast
    fetchSupportAgent(null);
  }

})();

