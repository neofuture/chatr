/**
 * Chatr Support Widget
 * Drop-in embeddable chat widget — connects visitors to the Chatr support agent.
 *
 * Simplest usage — all config as data attributes on the script tag:
 *   <script
 *     src="https://api.chatr-app.online/widget/chatr.js"
 *     data-accent-color="#f97316"
 *     data-title="Support Chat"
 *     data-greeting="Hi there 👋 How can we help?"
 *   ></script>
 *
 * Alternative: set window.ChatrWidgetConfig before the script tag:
 *   window.ChatrWidgetConfig = {
 *     apiUrl: 'https://api.chatr-app.online',  // override API base URL
 *     accentColor: '#f97316',                  // override accent colour
 *     greeting: 'Hi! How can we help you?',    // override greeting text
 *     title: 'Support Chat',                   // override chat header title
 *     devMode: true,                           // always start fresh (no session persistence)
 *   };
 *
 * Priority: ChatrWidgetConfig > data-* attribute > built-in default
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

  // Read a data attribute from the chatr.js script tag itself.
  // This allows inline config without a separate ChatrWidgetConfig block:
  //   <script src="chatr.js" data-accent-color="#9333ea"></script>
  // Priority: ChatrWidgetConfig > data-* attribute > built-in default
  function getScriptAttr(name) {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('chatr.js') !== -1) {
        return scripts[i].getAttribute(name) || null;
      }
    }
    return null;
  }

  var API_URL = detectApiUrl();
  var ACCENT   = cfg.accentColor || getScriptAttr('data-accent-color') || '#f97316';

  // Derive a second gradient stop from the accent colour.
  // Shifts hue by -30° and reduces lightness by 15% for a natural-looking gradient.
  // Can be overridden via cfg.accentColor2 or data-accent-color-2 on the script tag.
  function hexToHsl(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.slice(0,2),16)/255;
    var g = parseInt(hex.slice(2,4),16)/255;
    var b = parseInt(hex.slice(4,6),16)/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b), h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; } else {
      var d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        default: h = ((r-g)/d + 4)/6;
      }
    }
    return [h*360, s*100, l*100];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    var c = (1 - Math.abs(2*l-1)) * s;
    var x = c * (1 - Math.abs((h/60)%2 - 1));
    var m = l - c/2, r, g, b;
    if      (h < 60)  { r=c; g=x; b=0; }
    else if (h < 120) { r=x; g=c; b=0; }
    else if (h < 180) { r=0; g=c; b=x; }
    else if (h < 240) { r=0; g=x; b=c; }
    else if (h < 300) { r=x; g=0; b=c; }
    else              { r=c; g=0; b=x; }
    var toHex = function(v) { var h = Math.round((v+m)*255).toString(16); return h.length===1?'0'+h:h; };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  function deriveAccent2(hex) {
    var hsl = hexToHsl(hex);
    return hslToHex(hsl[0] - 30, hsl[1], hsl[2] - 15);
  }

  var ACCENT2 = (cfg.accentColor2 != null ? cfg.accentColor2 : null) || getScriptAttr('data-accent-color-2') || deriveAccent2(ACCENT);

  var TITLE    = cfg.title       || getScriptAttr('data-title')        || 'Support Chat';
  var GREETING = cfg.greeting    || getScriptAttr('data-greeting')     || 'Hi there 👋 How can we help you today?';

  // devMode: only active when explicitly set via config (devMode: true).
  // Sessions are ALWAYS persisted in localStorage unless devMode is on.
  // Do NOT auto-detect localhost — the demo page and local testing should still
  // retain sessions across refreshes just like production.
  var DEV_MODE = !!cfg.devMode;

  var SESSION_KEY = 'chatr_widget_session';
  var SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  var DEFAULT_PROFILE = API_URL + '/assets/default-profile.jpg';
  var AVATAR_IMG_CSS = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
  var ICONS_URL = API_URL + '/widget/icons/';
  function ico(name, w, h) {
    var u = 'url(' + ICONS_URL + name + '.svg)';
    return '<span class="chatr-ico" style="width:' + w + 'px;height:' + (h || w) + 'px;-webkit-mask-image:' + u + ';mask-image:' + u + '"></span>';
  }
  var ICO_COPY   = '\u29C9';
  var ICO_CHECK  = '\u2713';
  var ICO_VID    = '\uD83C\uDFA5';

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
      state.open      = !!saved.open;
    }
  }

  // ── Theme ─────────────────────────────────────────────────────────────────────
  // Priority: cfg.theme > data-theme attr > 'auto'
  // Values: 'dark' | 'light' | 'auto'  (auto = follows prefers-color-scheme)
  var THEME = cfg.theme || getScriptAttr('data-theme') || 'auto';

  // ── Theme token data (defined once, reused for all selectors) ────────────────
  var THEME_DARK = {
    '--cw-bg':'#0f172a','--cw-bg2':'#1e293b',
    '--cw-border':'rgba(255,255,255,.08)','--cw-border2':'rgba(255,255,255,.12)',
    '--cw-text':'#f1f5f9','--cw-text2':'#e2e8f0','--cw-text3':'#94a3b8','--cw-text4':'#64748b',
    '--cw-input-bg':'rgba(255,255,255,.07)','--cw-recv-bg':'rgba(255,255,255,.1)','--cw-recv-text':'#e2e8f0',
    '--cw-greet-bg':'rgba(255,255,255,.06)','--cw-scroll':'rgba(255,255,255,.15)','--cw-shadow':'rgba(0,0,0,.5)',
    '--cw-powered':'#334155','--cw-powered-a':'#475569',
    '--cw-audio-sent-bg':'rgba(255,255,255,.15)','--cw-audio-play-bg':'rgba(255,255,255,.2)',
    '--cw-audio-play-color':'#fff','--cw-audio-bar':'rgba(255,255,255,.3)'
  };
  var THEME_LIGHT = {
    '--cw-bg':'#ffffff','--cw-bg2':'#f8fafc',
    '--cw-border':'rgba(0,0,0,.08)','--cw-border2':'rgba(0,0,0,.12)',
    '--cw-text':'#0f172a','--cw-text2':'#1e293b','--cw-text3':'#475569','--cw-text4':'#94a3b8',
    '--cw-input-bg':'rgba(0,0,0,.04)','--cw-recv-bg':'#f1f5f9','--cw-recv-text':'#1e293b',
    '--cw-greet-bg':'#f1f5f9','--cw-scroll':'rgba(0,0,0,.15)','--cw-shadow':'rgba(0,0,0,.15)',
    '--cw-powered':'#94a3b8','--cw-powered-a':'#64748b',
    '--cw-audio-sent-bg':'rgba(0,0,0,.06)','--cw-audio-play-bg':'rgba(0,0,0,.1)',
    '--cw-audio-play-color':'#1e293b','--cw-audio-bar':'rgba(0,0,0,.2)'
  };
  function themeVars(obj) {
    var s = '';
    for (var k in obj) s += k + ':' + obj[k] + ';';
    return s;
  }

  // ── Inject styles ────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  var darkVars = themeVars(THEME_DARK);
  var lightVars = themeVars(THEME_LIGHT);
  style.textContent = [
    '#chatr-widget-panel[data-chatr-theme="dark"]{' + darkVars + '}',
    '#chatr-widget-panel[data-chatr-theme="light"]{' + lightVars + '}',
    '@media (prefers-color-scheme:dark){#chatr-widget-panel[data-chatr-theme="auto"]{' + darkVars + '}}',
    '@media (prefers-color-scheme:light){#chatr-widget-panel[data-chatr-theme="auto"]{' + lightVars + '}}',
    '#chatr-widget-panel[data-chatr-theme="auto"]{' + darkVars + '}',
    // ── Component styles (use tokens) ───────────────────────────────────────
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
      'background:var(--cw-bg);border-radius:16px;',
      'box-shadow:0 8px 40px var(--cw-shadow);',
      'display:flex;flex-direction:column;overflow:hidden;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'border:1px solid var(--cw-border);',
      'opacity:0;transform:translateY(12px) scale(.97);',
      'transition:opacity .25s,transform .25s,background .2s,border-color .2s;pointer-events:none;',
    '}',
    '#chatr-widget-panel.open{opacity:1;transform:none;pointer-events:all}',
    /* Header — always uses gradient, text always white */
    '#chatr-w-header{',
      'background:linear-gradient(135deg,' + ACCENT + ','+ ACCENT2 +');',
      'padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;',
    '}',
    '#chatr-w-header-avatar{',
      'width:42px;height:42px;border-radius:50%;object-fit:cover;',
      'border:2px solid rgba(255,255,255,.4);flex-shrink:0;',
      'background:rgba(255,255,255,.2);display:flex;align-items:center;',
      'justify-content:center;font-size:18px;color:#fff;font-weight:700;overflow:hidden;',
    '}',
    '#chatr-w-header-info{flex:1;min-width:0}',
    '#chatr-w-header-name{color:#fff;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#chatr-w-header-status{color:rgba(255,255,255,.75);font-size:12px;display:flex;align-items:center;gap:4px}',
    '.chatr-status-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0}',
    '#chatr-w-close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;font-size:20px;padding:4px;line-height:1;flex-shrink:0}',
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
    '#chatr-w-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;background:var(--cw-bg)}',
    '#chatr-w-body::-webkit-scrollbar{width:4px}',
    '#chatr-w-body::-webkit-scrollbar-track{background:transparent}',
    '#chatr-w-body::-webkit-scrollbar-thumb{background:var(--cw-scroll);border-radius:2px}',
    /* Intro phase */
    '#chatr-w-intro{display:flex;flex-direction:column;gap:16px;padding:8px 0}',
    '#chatr-w-greeting{background:var(--cw-greet-bg);border-radius:12px;padding:14px;color:var(--cw-text2);font-size:14px;line-height:1.5}',
    '.chatr-field{display:flex;flex-direction:column;gap:6px}',
    '.chatr-label{color:var(--cw-text3);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}',
    '.chatr-input{',
      'background:var(--cw-input-bg);border:1px solid var(--cw-border2);',
      'border-radius:8px;padding:10px 12px;color:var(--cw-text);font-size:14px;',
      'outline:none;transition:border-color .2s;width:100%;box-sizing:border-box;font-family:inherit;resize:none;',
    '}',
    '.chatr-input:focus{border-color:' + ACCENT + '}',
    '.chatr-input::placeholder{color:var(--cw-text4)}',
    '.chatr-btn{background:' + ACCENT + ';color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s;font-family:inherit}',
    '.chatr-btn:hover{opacity:.9}',
    '.chatr-btn:disabled{opacity:.5;cursor:not-allowed}',
    /* Chat phase */
    '.chatr-msg{display:flex;gap:8px;max-width:88%;min-width:0}',
    '.chatr-msg.audio-msg{width:80%;max-width:88%}',
    '.chatr-msg.sent{align-self:flex-end;flex-direction:row-reverse}',
    '.chatr-msg.recv{align-self:flex-start}',
    '.chatr-msg-avatar{',
      'width:28px;height:28px;border-radius:50%;flex-shrink:0;',
      'background:linear-gradient(135deg,' + ACCENT + ','+ ACCENT2 +');',
      'display:flex;align-items:center;justify-content:center;',
      'color:#fff;font-size:11px;font-weight:700;overflow:hidden;align-self:flex-end;',
    '}',
    '.chatr-msg-bubble{padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;max-width:100%;word-wrap:break-word}',
    '.chatr-msg.sent .chatr-msg-bubble{background:' + ACCENT + ';color:#fff;border-bottom-right-radius:4px}',
    '.chatr-msg.recv .chatr-msg-bubble{background:var(--cw-recv-bg);color:var(--cw-recv-text);border-bottom-left-radius:4px}',
    '.chatr-msg-time{font-size:10px;color:var(--cw-text4);margin-top:3px;text-align:right}',
    '.chatr-msg.recv .chatr-msg-time{text-align:left}',
    '.chatr-typing{display:flex;align-items:center;gap:4px;padding:10px 12px;background:var(--cw-recv-bg);border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start}',
    '.chatr-typing span{width:6px;height:6px;border-radius:50%;background:var(--cw-text3);animation:chatr-bounce .9s infinite;display:inline-block}',
    '.chatr-typing span:nth-child(2){animation-delay:.2s}',
    '.chatr-typing span:nth-child(3){animation-delay:.4s}',
    '@keyframes chatr-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',
    '@keyframes chatr-spinner{to{transform:rotate(360deg)}}',
    '.chatr-spin{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:chatr-spinner .7s linear infinite}',
    '.chatr-ico{display:inline-block;background:currentColor;-webkit-mask-size:contain;-webkit-mask-repeat:no-repeat;-webkit-mask-position:center;mask-size:contain;mask-repeat:no-repeat;mask-position:center}',
    /* Footer / input */
    '#chatr-w-footer{padding:10px 12px;border-top:1px solid var(--cw-border);background:var(--cw-bg);display:flex;gap:8px;align-items:center;flex-shrink:0}',
    '#chatr-w-input{',
      'flex:1;background:var(--cw-input-bg);border:1px solid var(--cw-border2);',
      'border-radius:20px;padding:10px 14px;color:var(--cw-text);font-size:14px;',
      'outline:none;resize:none;max-height:100px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;font-family:inherit;line-height:1.4;transition:border-color .2s;',
    '}',
    '#chatr-w-input::-webkit-scrollbar{display:none}',
    '#chatr-w-input:focus{border-color:' + ACCENT + '}',
    '#chatr-w-input::placeholder{color:var(--cw-text4)}',
    '#chatr-w-attach{width:40px;height:40px;background:var(--cw-input-bg);border:1px solid var(--cw-border2);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s,border-color .2s;color:var(--cw-text3);font-size:16px;padding:0}',
    '#chatr-w-attach:hover{background:var(--cw-bg2);border-color:' + ACCENT + ';color:' + ACCENT + '}',
    '#chatr-w-send{width:40px;height:40px;background:' + ACCENT + ';color:#fff;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}',
    '#chatr-w-send:hover{opacity:.9}',
    '#chatr-w-send:disabled{opacity:.4;cursor:not-allowed}',
    '#chatr-w-file-input{display:none}',
    '.chatr-file-bubble{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--cw-bg2);border:1px solid var(--cw-border2);border-radius:10px;font-size:13px;max-width:240px}',
    '.chatr-file-icon{flex-shrink:0;width:36px;line-height:0}',
    '.chatr-file-info{min-width:0}',
    '.chatr-file-name{color:var(--cw-text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}',
    '.chatr-file-size{color:var(--cw-text4);font-size:11px}',
    '.chatr-img-bubble{max-width:200px;border-radius:10px;display:block;cursor:pointer}',
    '.chatr-video-bubble{width:100%;max-width:260px;border-radius:10px;display:block;cursor:default;background:#000}',
    '.chatr-text-clip{overflow:hidden;position:relative;transition:max-height .35s ease}',
    '.chatr-text-fade{position:absolute;bottom:0;left:0;right:0;height:60px;pointer-events:none}',
    '.chatr-msg.sent .chatr-text-fade{background:linear-gradient(to bottom,transparent,' + ACCENT + ')}',
    '.chatr-msg.recv .chatr-text-fade{background:linear-gradient(to bottom,transparent,var(--cw-recv-bg))}',
    '.chatr-read-more{display:block;margin:6px auto 0;cursor:pointer;font-size:10px;font-weight:600;padding:3px 12px;border-radius:12px;text-align:center;transition:background .15s}',
    '.chatr-msg.sent .chatr-read-more{color:rgba(255,255,255,.95);background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25)}',
    '.chatr-msg.sent .chatr-read-more:hover{background:rgba(255,255,255,.2)}',
    '.chatr-msg.recv .chatr-read-more{color:var(--cw-text);background:rgba(128,128,128,.1);border:1px solid rgba(128,128,128,.2)}',
    '.chatr-msg.recv .chatr-read-more:hover{background:rgba(128,128,128,.18)}',
    '.chatr-system-msg{text-align:center;color:var(--cw-text4);font-size:12px;padding:4px 0}',
    '#chatr-w-powered{text-align:center;font-size:10px;color:var(--cw-powered);padding:4px 0 8px;flex-shrink:0;background:var(--cw-bg)}',
    '#chatr-w-powered a{color:var(--cw-powered-a);text-decoration:none}',
    '#chatr-w-powered a:hover{color:var(--cw-text4)}',
    /* Audio player */
    '.chatr-audio{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;padding:8px 10px;border-radius:14px;background:var(--cw-recv-bg);overflow:hidden}',
    '.chatr-msg.sent .chatr-audio{background:var(--cw-audio-sent-bg)}',
    '.chatr-audio-controls{display:flex;align-items:center;gap:8px;width:100%;min-width:0}',
    '.chatr-audio-play{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;background:var(--cw-audio-play-bg);color:var(--cw-audio-play-color);transition:opacity .2s}',
    '.chatr-audio-play:hover{opacity:.8}',
    '.chatr-audio-play:disabled{opacity:.4;cursor:not-allowed}',
    '.chatr-audio-canvas{flex:1;min-width:0;height:36px;min-height:36px;cursor:pointer;display:block}',
    '.chatr-audio-bottom{display:flex;justify-content:space-between;font-size:10px;color:var(--cw-text4);padding:0 2px}',
    /* Code blocks */
    '.chatr-code-block{margin:4px 0;border-radius:8px;overflow:hidden;background:#0d1117;border:1px solid rgba(255,255,255,0.08);font-size:12px;color:#e6edf3;width:100%;box-sizing:border-box}',
    '.chatr-code-header{display:flex;align-items:center;justify-content:space-between;padding:4px 10px;background:#161b22;border-bottom:1px solid rgba(255,255,255,0.06);user-select:none}',
    '.chatr-code-lang{font-size:10px;font-weight:600;color:#7d8590;text-transform:lowercase;letter-spacing:.5px}',
    '.chatr-code-copy{background:none;border:none;cursor:pointer;color:#7d8590;font-size:10px;padding:2px 4px;border-radius:4px;transition:color .15s}',
    '.chatr-code-copy:hover{color:#e6edf3}',
    '.chatr-code-pre{margin:0;padding:10px;overflow-x:auto;white-space:pre;font-family:ui-monospace,monospace;font-size:12px;line-height:1.5}',
    '.chatr-tok-comment{color:#8b949e}',
    '.chatr-tok-string{color:#a5d6ff}',
    '.chatr-tok-keyword{color:#ff7b72}',
    '.chatr-tok-number{color:#79c0ff}',
    '.chatr-tok-operator{color:#ff7b72}',
    '.chatr-tok-punctuation{color:#c9d1d9}',
    '.chatr-tok-plain{color:#e6edf3}',
  ].join('');
  document.head.appendChild(style);


  // ── Build DOM ────────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'chatr-widget-btn';
  btn.setAttribute('aria-label', 'Open support chat');
  btn.innerHTML = ico('chat', 26);

  var badge = document.createElement('span');
  badge.id = 'chatr-widget-badge';
  badge.style.display = 'none';
  btn.appendChild(badge);

  var panel = document.createElement('div');
  panel.id = 'chatr-widget-panel';
  panel.setAttribute('data-chatr-theme', THEME);
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
      '<input type="file" id="chatr-w-file-input" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.mp3,.mp4" aria-label="Attach file"/>',
      '<button id="chatr-w-attach" aria-label="Attach file" title="Attach file">' + ico('attach', 18) + '</button>',
      '<textarea id="chatr-w-input" placeholder="Type a message…" rows="1" aria-label="Message input"></textarea>',
      '<button id="chatr-w-send" aria-label="Send message" disabled>' + ico('send', 15) + '</button>',
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
  var elAttach     = document.getElementById('chatr-w-attach');
  var elFileInput  = document.getElementById('chatr-w-file-input');
  var elAvatar     = document.getElementById('chatr-w-header-avatar');
  var elName       = document.getElementById('chatr-w-header-name');
  var elStatusTxt  = document.getElementById('chatr-w-status-text');
  var elClose      = document.getElementById('chatr-w-close');
  var elEndBtn     = document.getElementById('chatr-w-end-btn');

  // ── Theme-change listener for canvas redraws ────────────────────────────────
  var _audioRedrawCallbacks = [];
  if (typeof window.matchMedia === 'function') {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        for (var i = 0; i < _audioRedrawCallbacks.length; i++) _audioRedrawCallbacks[i]();
      });
    } catch (e) { /* older browsers */ }
  }

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

  // ── Code block support ───────────────────────────────────────────────────────

  var CODE_KEYWORDS = new Set('const let var function return if else for while do switch case break continue class extends new this super import export default from async await try catch finally throw typeof instanceof in of void delete static get set public private protected readonly interface type enum namespace declare abstract as is def lambda pass None True False and or not with yield global nonlocal assert raise except elif fn mut use mod struct impl trait where match Some Ok Err func go defer chan map range select package null undefined true false'.split(' '));

  function tokeniseCode(code) {
    var tokens = [];
    var i = 0;
    while (i < code.length) {
      // single-line comment //
      if (code[i] === '/' && code[i+1] === '/') {
        var end = code.indexOf('\n', i);
        var val = end === -1 ? code.slice(i) : code.slice(i, end);
        tokens.push({ t: 'comment', v: val }); i += val.length; continue;
      }
      // hash comment #
      if (code[i] === '#') {
        var end2 = code.indexOf('\n', i);
        var val2 = end2 === -1 ? code.slice(i) : code.slice(i, end2);
        tokens.push({ t: 'comment', v: val2 }); i += val2.length; continue;
      }
      // block comment /* */
      if (code[i] === '/' && code[i+1] === '*') {
        var end3 = code.indexOf('*/', i+2);
        var val3 = end3 === -1 ? code.slice(i) : code.slice(i, end3+2);
        tokens.push({ t: 'comment', v: val3 }); i += val3.length; continue;
      }
      // template literal
      if (code[i] === '`') {
        var j = i+1;
        while (j < code.length && code[j] !== '`') { if (code[j] === '\\') j++; j++; }
        tokens.push({ t: 'string', v: code.slice(i, j+1) }); i = j+1; continue;
      }
      // string ' or "
      if (code[i] === '"' || code[i] === "'") {
        var q = code[i], j2 = i+1;
        while (j2 < code.length && code[j2] !== q) { if (code[j2] === '\\') j2++; j2++; }
        tokens.push({ t: 'string', v: code.slice(i, j2+1) }); i = j2+1; continue;
      }
      // number
      if (/[0-9]/.test(code[i])) {
        var j3 = i;
        while (j3 < code.length && /[0-9._xXa-fA-FnN]/.test(code[j3])) j3++;
        tokens.push({ t: 'number', v: code.slice(i, j3) }); i = j3; continue;
      }
      // word
      if (/[a-zA-Z_$]/.test(code[i])) {
        var j4 = i+1;
        while (j4 < code.length && /[a-zA-Z0-9_$]/.test(code[j4])) j4++;
        var word = code.slice(i, j4);
        tokens.push({ t: CODE_KEYWORDS.has(word) ? 'keyword' : 'plain', v: word });
        i = j4; continue;
      }
      // operator
      if (/[=!<>+\-*/%&|^~?:]/.test(code[i])) {
        tokens.push({ t: 'operator', v: code[i] }); i++; continue;
      }
      // punctuation
      if (/[{}()[\];,.]/.test(code[i])) {
        tokens.push({ t: 'punctuation', v: code[i] }); i++; continue;
      }
      tokens.push({ t: 'plain', v: code[i] }); i++;
    }
    return tokens;
  }

  function parseCodeBlocks(text) {
    var segments = [];
    var lines = text.split('\n');
    var inCode = false, lang = '', codeLines = [], textLines = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], trimmed = line.trim();
      if (!inCode) {
        var inlineMatch = trimmed.match(/^(`{3,})(.+?)\1\s*$/);
        if (inlineMatch) {
          if (textLines.length) segments.push({ kind: 'text', content: textLines.join('\n') });
          textLines = [];
          segments.push({ kind: 'code', lang: 'code', content: inlineMatch[2].trim() });
        } else if (/^`{3,}/.test(trimmed)) {
          if (textLines.length) segments.push({ kind: 'text', content: textLines.join('\n') });
          textLines = [];
          lang = trimmed.replace(/^`+/, '').trim();
          inCode = true;
        } else { textLines.push(line); }
      } else {
        if (/^`{2,}\s*$/.test(trimmed)) {
          segments.push({ kind: 'code', lang: lang || 'code', content: codeLines.join('\n') });
          codeLines = []; lang = ''; inCode = false;
        } else { codeLines.push(line); }
      }
    }
    if (inCode) {
      if (codeLines.length) segments.push({ kind: 'code', lang: lang || 'code', content: codeLines.join('\n') });
      else if (lang) segments.push({ kind: 'code', lang: 'code', content: lang });
      codeLines = []; lang = '';
    }
    if (textLines.length) segments.push({ kind: 'text', content: textLines.join('\n') });
    return segments;
  }

  function renderCodeBlockEl(lang, content) {
    var block = document.createElement('div');
    block.className = 'chatr-code-block';
    // header
    var header = document.createElement('div');
    header.className = 'chatr-code-header';
    var langEl = document.createElement('span');
    langEl.className = 'chatr-code-lang';
    langEl.textContent = lang;
    var copyBtn = document.createElement('button');
    copyBtn.className = 'chatr-code-copy';
    copyBtn.textContent = ICO_COPY + ' Copy';
    copyBtn.onclick = function(e) {
      e.stopPropagation();
      navigator.clipboard.writeText(content).then(function() {
        copyBtn.textContent = ICO_CHECK + ' Copied!';
        setTimeout(function() { copyBtn.textContent = ICO_COPY + ' Copy'; }, 2000);
      });
    };
    header.appendChild(langEl);
    header.appendChild(copyBtn);
    // code body
    var pre = document.createElement('pre');
    pre.className = 'chatr-code-pre';
    var code = document.createElement('code');
    code.className = 'chatr-code-body';
    var tokens = tokeniseCode(content);
    for (var i = 0; i < tokens.length; i++) {
      var span = document.createElement('span');
      span.className = 'chatr-tok-' + tokens[i].t;
      span.textContent = tokens[i].v;
      code.appendChild(span);
    }
    pre.appendChild(code);
    block.appendChild(header);
    block.appendChild(pre);
    return block;
  }

  function formatTime(d) {
    d = d ? new Date(d) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollBottom() {
    elBody.scrollTop = elBody.scrollHeight;
  }

  // Scroll to bottom and keep retrying until scrollHeight stops growing.
  // This handles the race condition where images / file cards haven't
  // finished laying out yet when the first scroll fires.
  function scrollBottomHard() {
    var attempts = 0;
    var last = -1;
    function tryScroll() {
      elBody.scrollTop = elBody.scrollHeight;
      var current = elBody.scrollHeight;
      if (current !== last && attempts < 20) {
        last = current;
        attempts++;
        setTimeout(tryScroll, 50);
      }
    }
    tryScroll();
  }

  function persist(chatOnly) {
    if (DEV_MODE) return;
    if (chatOnly && state.phase !== 'chat') return;
    store.set({
      guestId:   state.guestId,
      token:     state.token,
      guestName: state.guestName,
      messages:  state.messages.slice(-100),
      open:      state.open,
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
      img.style.cssText = AVATAR_IMG_CSS;
      img.onerror = function () { elAvatar.textContent = '?'; };
      elAvatar.innerHTML = '';
      elAvatar.appendChild(img);
    } else {
      elAvatar.innerHTML = '';
      elAvatar.textContent = '?';
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
          '<label class="chatr-label" for="chatr-w-email-input">Email address</label>',
          '<input class="chatr-input" id="chatr-w-email-input" type="email" placeholder="So we can follow up with you" autocomplete="email" maxlength="255"/>',
        '</div>',
        '<div class="chatr-field">',
          '<label class="chatr-label" for="chatr-w-first-msg">What can we help with?</label>',
          '<textarea class="chatr-input" id="chatr-w-first-msg" placeholder="Tell us what\'s on your mind…" rows="3" maxlength="1000"></textarea>',
        '</div>',
        '<button class="chatr-btn" id="chatr-w-start-btn">Start Chat →</button>',
      '</div>',
    ].join('');

    var nameInput  = document.getElementById('chatr-w-name-input');
    var emailInput = document.getElementById('chatr-w-email-input');
    var msgInput   = document.getElementById('chatr-w-first-msg');
    var startBtn   = document.getElementById('chatr-w-start-btn');

    function tryStart() {
      var name  = nameInput.value.trim();
      var email = emailInput.value.trim();
      var msg   = msgInput.value.trim();
      if (!name)  { nameInput.focus(); return; }
      if (!email) { emailInput.focus(); return; }
      if (!msg)   { msgInput.focus();  return; }
      startBtn.disabled = true;
      startBtn.textContent = 'Connecting…';
      startSession(name, msg, email);
    }

    startBtn.addEventListener('click', tryStart);
    msgInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tryStart(); }
    });

    if (nameInput) nameInput.focus();
  }

  // ── Render a single message bubble ──────────────────────────────────────────
  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  var ICONS_URL = API_URL + '/widget/icons/';
  function fileIcon(mime) {
    var t = 'file';
    if (mime) {
      if (mime.startsWith('image/')) t = 'img';
      else if (mime.startsWith('audio/')) t = 'audio';
      else if (mime.startsWith('video/')) t = 'video';
      else if (mime.includes('pdf')) t = 'pdf';
      else if (mime.includes('word') || mime.includes('document')) t = 'doc';
      else if (mime.includes('sheet') || mime.includes('excel')) t = 'xls';
      else if (mime.includes('zip') || mime.includes('rar')) t = 'zip';
    }
    return '<img src="' + ICONS_URL + t + '.svg" width="36" height="44" alt="' + t + '" style="display:block">';
  }

  // ── Audio player (Canvas + Web Audio API, zero deps) ────────────────────────
  function renderAudioPlayer(msg, container, isSent) {
    var waveform = msg.waveformData || [];
    if (!waveform.length) {
      // Fallback placeholder waveform
      waveform = Array(50).fill(0).map(function(_, i) {
        return 0.2 + 0.6 * Math.abs(Math.sin(i / 50 * Math.PI * 8 + i * 0.3));
      });
    }

    var duration  = msg.duration || 0;
    var currentTime = 0;
    var isPlaying = false;
    var audioLoaded = false;

    // Build DOM
    var wrap = document.createElement('div');
    wrap.className = 'chatr-audio';

    var controls = document.createElement('div');
    controls.className = 'chatr-audio-controls';

    var playBtn = document.createElement('button');
    playBtn.className = 'chatr-audio-play';
    playBtn.disabled = true;
    playBtn.setAttribute('aria-label', 'Play voice message');
    playBtn.innerHTML = '<span class="chatr-spin"></span>';

    var canvas = document.createElement('canvas');
    canvas.className = 'chatr-audio-canvas';
    // No height/width attributes — drawWave sets them from getBoundingClientRect + DPR

    var bottom = document.createElement('div');
    bottom.className = 'chatr-audio-bottom';

    var timeEl = document.createElement('span');
    timeEl.textContent = '0:00 / ' + fmtSecs(duration);

    bottom.appendChild(timeEl);

    controls.appendChild(playBtn);
    controls.appendChild(canvas);
    wrap.appendChild(controls);
    wrap.appendChild(bottom);
    container.appendChild(wrap);

    // Audio element
    var audio = document.createElement('audio');
    audio.src = msg.content; // content = fileUrl after normaliseMsg
    audio.preload = 'auto';
    audio.playsInline = true;

    function fmtSecs(s) {
      if (!s || isNaN(s) || !isFinite(s)) return '0:00';
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }


    var _inactiveBarColor = '';
    function getInactiveBarColor() {
      _inactiveBarColor = getComputedStyle(panel).getPropertyValue('--cw-audio-bar').trim() || 'rgba(255,255,255,0.3)';
      return _inactiveBarColor;
    }

    function drawWave(freshMeasure) {
      if (freshMeasure) {
        canvas.style.width  = '';
        canvas.style.height = '';
        getInactiveBarColor();
      }
      var rect0 = canvas.getBoundingClientRect();
      var cssW = rect0.width  || canvas.offsetWidth;
      var cssH = rect0.height || canvas.offsetHeight || 36;
      if (cssW < 4) { requestAnimationFrame(function(){ drawWave(false); }); return; }
      var dpr = window.devicePixelRatio || 1;
      var newW = Math.round(cssW * dpr);
      var newH = Math.round(cssH * dpr);
      if (canvas.width !== newW)  canvas.width  = newW;
      if (canvas.height !== newH) canvas.height = newH;
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var bars = waveform.length;
      var gap  = 1;
      var barW = Math.max(1, (cssW - gap * (bars - 1)) / bars);
      var progress = duration > 0 ? currentTime / duration : 0;
      ctx.clearRect(0, 0, cssW, cssH);
      var barInactive = _inactiveBarColor || getInactiveBarColor();
      var progressX = progress * cssW;
      for (var i = 0; i < bars; i++) {
        var amp  = Math.max(waveform[i] || 0, 0.05);
        var barH = Math.round(amp * (cssH - 4));
        var x    = i * (barW + gap);
        var y    = (cssH - barH) / 2;
        var barCenter = x + barW / 2;
        var passed = progress > 0 && barCenter <= progressX;
        ctx.fillStyle = passed
          ? (isSent ? '#f97316' : '#3b82f6')
          : barInactive;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 1) : ctx.rect(x, y, barW, barH);
        ctx.fill();
      }
    }

    function updateUI() {
      timeEl.textContent = fmtSecs(currentTime) + ' / ' + fmtSecs(duration);
      drawWave(false);
    }

    canvas.addEventListener('click', function(e) {
      if (!audioLoaded || duration <= 0) return;
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 4) return;
      var clickRelative = e.clientX - rect.left;
      var pct = Math.max(0, Math.min(1, clickRelative / rect.width));
      audio.currentTime = pct * duration;
      currentTime = audio.currentTime;
      updateUI();
    });

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function() { drawWave(true); });
      ro.observe(canvas);
    }

    // Play/pause
    playBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!audioLoaded) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(function() {});
      }
    });

    function syncDuration() {
      var d = audio.duration;
      if (d && isFinite(d) && d > 0) duration = d;
    }

    var rafId = null;
    function startRAF() {
      if (rafId) return;
      (function tick() {
        if (!isPlaying) { rafId = null; return; }
        currentTime = audio.currentTime;
        syncDuration();
        drawWave(false);
        timeEl.textContent = fmtSecs(currentTime) + ' / ' + fmtSecs(duration);
        rafId = requestAnimationFrame(tick);
      })();
    }
    function stopRAF() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    audio.addEventListener('loadedmetadata', syncDuration);

    audio.addEventListener('canplay', function() {
      audioLoaded = true;
      syncDuration();
      playBtn.disabled = false;
      playBtn.innerHTML = ico('play', 12);
      updateUI();
      requestAnimationFrame(drawWave);
    });

    audio.addEventListener('timeupdate', function() {
      currentTime = audio.currentTime;
      syncDuration();
      if (!isPlaying) updateUI();
    });

    audio.addEventListener('play', function() {
      isPlaying = true;
      playBtn.innerHTML = ico('pause', 12);
      playBtn.setAttribute('aria-label', 'Pause voice message');
      startRAF();
    });

    audio.addEventListener('pause', function() {
      isPlaying = false;
      stopRAF();
      playBtn.innerHTML = ico('play', 12);
      playBtn.setAttribute('aria-label', 'Play voice message');
      updateUI();
    });

    audio.addEventListener('ended', function() {
      isPlaying = false;
      stopRAF();
      currentTime = 0;
      audio.currentTime = 0;
      playBtn.innerHTML = ico('play', 12);
      updateUI();
    });

    _audioRedrawCallbacks.push(function () { drawWave(true); });
    requestAnimationFrame(function() { drawWave(true); });
    audio.load();
  }

  function renderMessage(msg) {
    var isSent = msg.senderId === state.guestId;
    var wrap = document.createElement('div');
    wrap.className = 'chatr-msg ' + (isSent ? 'sent' : 'recv');
    wrap.setAttribute('data-msg-id', msg.id || '');

    var avatarHtml = '';
    if (!isSent) {
      avatarHtml = '<div class="chatr-msg-avatar" aria-hidden="true"><img src="' + DEFAULT_PROFILE + '" style="' + AVATAR_IMG_CSS + '" onerror="this.style.display=\'none\'"/></div>';
    }

    var isAudioMsg = msg.type === 'audio' || (msg.mimeType && msg.mimeType.startsWith('audio/'));
    var isVideoMsg = !isAudioMsg && (msg.type === 'video' || (msg.mimeType && msg.mimeType.startsWith('video/')));
    var isImageMsg = !isAudioMsg && !isVideoMsg && (msg.type === 'image' || (msg.mimeType && msg.mimeType.startsWith('image/')));
    var isFileMsg  = !isAudioMsg && !isVideoMsg && !isImageMsg && (msg.type === 'file' || (msg.fileName && msg.type !== 'text'));

    if (isAudioMsg) {
      // Build outer flex row with avatar + player
      wrap.classList.add('audio-msg');
      if (avatarHtml) wrap.innerHTML = avatarHtml;
      var playerCol = document.createElement('div');
      playerCol.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1;' + (isSent ? 'align-items:flex-end' : '');
      renderAudioPlayer(msg, playerCol, isSent);
      var timeDiv = document.createElement('div');
      timeDiv.className = 'chatr-msg-time';
      timeDiv.textContent = formatTime(msg.createdAt || msg.timestamp);
      playerCol.appendChild(timeDiv);
      wrap.appendChild(playerCol);
    } else {
      if (isImageMsg) {
        var uploading = msg._uploading ? 'opacity:.5' : '';
        var imgHtml = '<img class="chatr-img-bubble" src="' + escHtml(msg.content) + '" alt="' + escHtml(msg.fileName || 'image') + '" style="' + uploading + '" onclick="var a=document.createElement(\'a\');a.href=this.src;a.download=' + JSON.stringify(msg.fileName || 'image') + ';a.target=\'_blank\';a.click()" />';
        wrap.innerHTML = avatarHtml + '<div style="display:flex;flex-direction:column;' + (isSent ? 'align-items:flex-end' : '') + '">' + imgHtml + '<div class="chatr-msg-time">' + formatTime(msg.createdAt || msg.timestamp) + '</div></div>';
      } else if (isVideoMsg) {
        var uploadingV = msg._uploading ? 'opacity:.5;' : '';
        var colDiv = document.createElement('div');
        colDiv.style.cssText = 'display:flex;flex-direction:column;' + (isSent ? 'align-items:flex-end' : '') + ';max-width:260px';
        var videoEl = document.createElement('video');
        videoEl.className = 'chatr-video-bubble';
        videoEl.src = msg.content + '#t=0.1';
        videoEl.controls = true;
        videoEl.playsInline = true;
        videoEl.preload = 'metadata';
        if (uploadingV) videoEl.style.opacity = '0.5';
        colDiv.appendChild(videoEl);
        if (msg.fileName) {
          var nameDiv = document.createElement('div');
          nameDiv.style.cssText = 'font-size:11px;color:var(--cw-text4);padding:2px 4px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
          nameDiv.innerHTML = ICO_VID + ' ' + escHtml(msg.fileName);
          colDiv.appendChild(nameDiv);
        }
        var timeDiv2 = document.createElement('div');
        timeDiv2.className = 'chatr-msg-time';
        timeDiv2.textContent = formatTime(msg.createdAt || msg.timestamp);
        colDiv.appendChild(timeDiv2);
        wrap.innerHTML = avatarHtml;
        wrap.appendChild(colDiv);
      } else if (isFileMsg) {
        var uploading2 = msg._uploading ? 'opacity:.5' : '';
        var fileHtml = '<div class="chatr-file-bubble" style="' + uploading2 + '">' +
          '<span class="chatr-file-icon">' + fileIcon(msg.mimeType) + '</span>' +
          '<div class="chatr-file-info">' +
            '<div class="chatr-file-name">' + escHtml(msg.fileName || 'File') + '</div>' +
            '<div class="chatr-file-size">' + formatFileSize(msg.fileSize) + (msg._uploading ? ' · Uploading…' : '') + '</div>' +
          '</div>' +
          (msg.content && !msg._uploading ? '<a href="' + API_URL + '/api/messages/download/' + encodeURIComponent(msg.id || '') + '" target="_blank" rel="noopener" style="font-size:14px;text-decoration:none;flex-shrink:0;color:var(--cw-text3)" aria-label="Download">' + ico('attach', 14) + '</a>' : '') +
        '</div>';
        wrap.innerHTML = avatarHtml + '<div style="display:flex;flex-direction:column;' + (isSent ? 'align-items:flex-end' : '') + '">' + fileHtml + '<div class="chatr-msg-time">' + formatTime(msg.createdAt || msg.timestamp) + '</div></div>';
      } else {
        // Text — parse code fences, all inside a single bubble
        var msgCol = document.createElement('div');
        msgCol.style.cssText = 'display:flex;flex-direction:column;min-width:0;max-width:100%;' + (isSent ? 'align-items:flex-end' : '');

        var bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chatr-msg-bubble';

        var clipDiv = document.createElement('div');
        var segments = parseCodeBlocks(msg.content || '');
        for (var si = 0; si < segments.length; si++) {
          var seg = segments[si];
          if (seg.kind === 'code') {
            clipDiv.appendChild(renderCodeBlockEl(seg.lang, seg.content));
          } else {
            var span = document.createElement('span');
            span.style.whiteSpace = 'pre-wrap';
            span.textContent = seg.content;
            clipDiv.appendChild(span);
          }
        }
        bubbleDiv.appendChild(clipDiv);
        msgCol.appendChild(bubbleDiv);

        var timeDiv2 = document.createElement('div');
        timeDiv2.className = 'chatr-msg-time';
        timeDiv2.textContent = formatTime(msg.createdAt || msg.timestamp);
        msgCol.appendChild(timeDiv2);
        if (avatarHtml) wrap.innerHTML = avatarHtml;
        wrap.appendChild(msgCol);

        // Collapsible "Read more" for long text messages
        (function (clip, bbl) {
          var MAX_H = 200;
          var expanded = false;
          var animating = false;
          setTimeout(function () {
            if (clip.scrollHeight <= MAX_H + 30) return;
            clip.className = 'chatr-text-clip';
            clip.style.maxHeight = MAX_H + 'px';

            var fade = document.createElement('div');
            fade.className = 'chatr-text-fade';
            clip.appendChild(fade);

            var btn = document.createElement('button');
            btn.className = 'chatr-read-more';
            btn.textContent = 'Read more \u25BC';
            bbl.appendChild(btn);

            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (animating) return;
              animating = true;
              var willExpand = !expanded;

              if (willExpand) {
                var fullH = clip.scrollHeight;
                clip.style.maxHeight = MAX_H + 'px';
                clip.offsetHeight;
                clip.style.maxHeight = fullH + 'px';
              } else {
                clip.style.maxHeight = clip.scrollHeight + 'px';
                clip.offsetHeight;
                clip.style.maxHeight = MAX_H + 'px';
              }

              var onDone = function () {
                clip.removeEventListener('transitionend', onDone);
                animating = false;
                expanded = willExpand;
                if (willExpand) {
                  clip.style.maxHeight = 'none';
                  fade.style.display = 'none';
                } else {
                  fade.style.display = '';
                }
                btn.textContent = expanded ? 'Show less \u25B2' : 'Read more \u25BC';

                if (willExpand) {
                  var rowRect = wrap.getBoundingClientRect();
                  var bodyRect = elBody.getBoundingClientRect();
                  var overflow = rowRect.bottom - bodyRect.bottom + 20;
                  if (overflow > 0) {
                    elBody.scrollBy({ top: overflow, behavior: 'smooth' });
                  }
                }
              };
              clip.addEventListener('transitionend', onDone, { once: true });
              setTimeout(function () { if (animating) onDone(); }, 400);
            });
          }, 0);
        })(clipDiv, bubbleDiv);
      }
    }

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

    var avatarHtml = '<div class="chatr-msg-avatar" aria-hidden="true"><img src="' + DEFAULT_PROFILE + '" style="' + AVATAR_IMG_CSS + '" onerror="this.style.display=\'none\'"/></div>';

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
  function startSession(name, firstMessage, contactEmail) {
    var payload = { guestName: name, guestId: state.guestId };
    if (contactEmail) payload.contactEmail = contactEmail;
    fetch(API_URL + '/api/widget/guest-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      scrollBottomHard();
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
    var newAttach = elAttach.cloneNode(true);
    elAttach.parentNode.replaceChild(newAttach, elAttach);
    elAttach = newAttach;
    var newFileInput = elFileInput.cloneNode(true);
    elFileInput.parentNode.replaceChild(newFileInput, elFileInput);
    elFileInput = newFileInput;

    elInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Count open fences — if odd number, we're inside a code block, allow newline
        var openFences = (elInput.value.match(/^```/gm) || []).length % 2 !== 0;
        if (!openFences) { e.preventDefault(); sendMessage(); }
      }
    });
    elInput.addEventListener('input', function () {
      elInput.style.height = 'auto';
      elInput.style.height = Math.min(elInput.scrollHeight, 100) + 'px';
      elSend.disabled = !elInput.value.trim();
      if (state.socket && state.supportAgentId) {
        state.socket.emit('typing:start', { recipientId: state.supportAgentId });
        clearTimeout(state._typingTimer);
        state._typingTimer = setTimeout(function () {
          if (state.socket) state.socket.emit('typing:stop', { recipientId: state.supportAgentId });
        }, 2000);
      }
    });
    elSend.addEventListener('click', sendMessage);
    elAttach.addEventListener('click', function () { elFileInput.click(); });
    elFileInput.addEventListener('change', function () {
      if (elFileInput.files && elFileInput.files[0]) {
        sendFile(elFileInput.files[0]);
        elFileInput.value = '';
      }
    });
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
      state.messages = data.messages.map(normaliseMsg);
      elBody.innerHTML = '';
      state.messages.forEach(renderMessage);
      scrollBottomHard();
    })
    .catch(function () {});
  }

  // ── Normalise a message from the backend into widget format ─────────────────
  function normaliseMsg(m) {
    return {
      id:           m.id,
      senderId:     m.senderId,
      content:      m.fileUrl || m.content,
      type:         m.type || 'text',
      fileName:     m.fileName  || null,
      fileSize:     m.fileSize  || null,
      mimeType:     m.fileType  || m.mimeType || null,
      waveformData: m.audioWaveform || m.waveformData || null,
      duration:     m.audioDuration || m.duration     || 0,
      createdAt:    m.createdAt || m.timestamp,
    };
  }

  // ── Send a message ───────────────────────────────────────────────────────────
  function sendMessage() {
    var content = elInput.value.trim();
    if (!content || !state.socket || !state.supportAgentId) return;

    elInput.value = '';
    elInput.style.height = 'auto';
    elSend.disabled = true;

    state.socket.emit('typing:stop', { recipientId: state.supportAgentId });

    var tempMsg = {
      id: 'temp_' + Date.now(),
      senderId: state.guestId,
      content: content,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(tempMsg);
    renderMessage(tempMsg);
    persist();

    state.socket.emit('message:send', {
      recipientId: state.supportAgentId,
      content: content,
      type: 'text',
    });
  }

  // ── Send a file attachment ───────────────────────────────────────────────────
  function sendFile(file) {
    if (!state.token || !state.supportAgentId) return;

    // Show a temporary uploading placeholder
    var tempId = 'temp_file_' + Date.now();
    var isImage = file.type.startsWith('image/');
    var isVideo = file.type.startsWith('video/');
    var tempMsg = {
      id: tempId,
      senderId: state.guestId,
      content: (isImage || isVideo) ? URL.createObjectURL(file) : '',
      type: isImage ? 'image' : isVideo ? 'video' : 'file',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: new Date().toISOString(),
      _uploading: true,
    };
    renderMessage(tempMsg);
    scrollBottom();

    var formData = new FormData();
    formData.append('file', file);

    fetch(API_URL + '/api/widget/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + state.token },
      body: formData,
    })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
    .then(function (data) {
      // Replace temp placeholder with the real message
      var el = document.querySelector('[data-msg-id="' + tempId + '"]');
      if (el) el.remove();
      if (data.message) {
        // Normalise backend field names → widget field names
        var m = data.message;
        var normMsg = {
          id: m.id,
          senderId: m.senderId,
          content: m.fileUrl || m.content,
          type: m.type,
          fileName: m.fileName,
          fileSize: m.fileSize,
          mimeType: m.fileType || m.mimeType || null,
          createdAt: m.createdAt,
        };
        state.messages.push(normMsg);
        renderMessage(normMsg);
        persist();
      }
    })
    .catch(function (err) {
      console.error('[Chatr Widget] upload failed', err);
      var el = document.querySelector('[data-msg-id="' + tempId + '"]');
      if (el) {
        el.style.opacity = '0.5';
        var timeEl = el.querySelector('.chatr-msg-time');
        if (timeEl) timeEl.textContent = 'Upload failed';
      }
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
        persist();
      }
    });

    state.socket.on('disconnect', function () {
      elStatusTxt.textContent = 'Reconnecting…';
    });

    state.socket.on('connect_error', function (err) {
      console.error('[Chatr Widget] connect error', err.message);
      if (err.message && err.message.indexOf('Authentication error') !== -1) {
        // Token expired or invalid — clear session and reset to intro
        if (state.socket) { state.socket.disconnect(); state.socket = null; }
        store.clear();
        state.phase     = 'intro';
        state.token     = null;
        state.guestId   = null;
        state.guestName = null;
        state.messages  = [];
        elEndBtn.style.display = 'none';
        elFooter.style.display = 'none';
        elStatusTxt.textContent = 'Offline';
        if (state.open) {
          elBody.innerHTML = '';
          showSystemMsg('Your session has expired. Please start a new chat.');
          setTimeout(function () {
            elBody.innerHTML = '';
            fetchSupportAgent(function () { renderIntro(); });
          }, 2000);
        }
        return;
      }
      elStatusTxt.textContent = 'Connection error';
    });

    // Incoming message from support agent
    state.socket.on('message:received', function (data) {
      // Only show messages from the support agent
      if (data.senderId !== state.supportAgentId) return;

      hideTyping();
      state.agentTyping = false;

      var msg = normaliseMsg({
        id:            data.id || data.messageId,
        senderId:      data.senderId,
        content:       data.content,
        fileUrl:       data.fileUrl,
        type:          data.type,
        fileName:      data.fileName,
        fileSize:      data.fileSize,
        fileType:      data.fileType || data.mimeType,
        audioWaveform: data.audioWaveform || data.waveform,
        audioDuration: data.audioDuration || data.duration,
        createdAt:     data.timestamp || data.createdAt || new Date().toISOString(),
      });


      state.messages.push(msg);
      renderMessage(msg);
      persist();

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

    // Message edited by support agent — silently update content, no "edited" indicator
    state.socket.on('message:edited', function (data) {
      if (!data.messageId || data.content === undefined) return;
      var foundMsg = null;
      for (var i = 0; i < state.messages.length; i++) {
        if (state.messages[i].id === data.messageId) {
          state.messages[i].content = data.content;
          foundMsg = state.messages[i];
          break;
        }
      }
      // Re-render the text content in the DOM (handles code blocks correctly)
      var el = elBody.querySelector('[data-msg-id="' + data.messageId + '"]');
      if (el) {
        // Find the column div that holds bubbles + time (skip the avatar)
        var cols = el.querySelectorAll('div');
        var msgCol = null;
        for (var c = 0; c < cols.length; c++) {
          if (cols[c].querySelector('.chatr-msg-bubble') || cols[c].querySelector('.chatr-code-block')) {
            msgCol = cols[c]; break;
          }
        }
        if (msgCol) {
          // Preserve the time element
          var timeEl = msgCol.querySelector('.chatr-msg-time');
          var timeHtml = timeEl ? timeEl.outerHTML : '';
          // Rebuild content
          msgCol.innerHTML = '';
          var segments = parseCodeBlocks(data.content || '');
          for (var si = 0; si < segments.length; si++) {
            var seg = segments[si];
            if (seg.kind === 'code') {
              msgCol.appendChild(renderCodeBlockEl(seg.lang, seg.content));
            } else {
              var bubble = document.createElement('div');
              bubble.className = 'chatr-msg-bubble';
              bubble.textContent = seg.content;
              msgCol.appendChild(bubble);
            }
          }
          if (timeHtml) {
            var tmp = document.createElement('div');
            tmp.innerHTML = timeHtml;
            if (tmp.firstChild) msgCol.appendChild(tmp.firstChild);
          }
        }
      }
      persist();
    });

    // Message unsent by support agent — silently remove, no placeholder
    state.socket.on('message:unsent', function (data) {
      if (!data.messageId) return;
      state.messages = state.messages.filter(function (m) { return m.id !== data.messageId; });
      var el = elBody.querySelector('[data-msg-id="' + data.messageId + '"]');
      if (el) el.remove();
      persist();
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
    persist(true);

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
    persist(true);
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
          state.supportAvatar  = null; // always use default — never reveal real profile image
          elName.textContent   = firstName(state.supportName);
          var defaultImg = document.createElement('img');
          defaultImg.src = DEFAULT_PROFILE;
          defaultImg.style.cssText = AVATAR_IMG_CSS;
          defaultImg.onerror = function () { elAvatar.textContent = '?'; };
          elAvatar.innerHTML = '';
          elAvatar.appendChild(defaultImg);
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
        // Re-open the panel if it was open when the page was last closed/refreshed
        if (state.open) {
          panel.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          renderChatPhase(true);
        }
      });
    });
  } else {
    // No session — pre-fetch agent info silently so first open is fast
    fetchSupportAgent(null);
  }

})();

