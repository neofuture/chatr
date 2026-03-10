#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const SRC  = path.join(__dirname, 'chatr.js');
const DIST = path.join(__dirname, '..', 'widget', 'chatr.js');

// String replacement map — longest first to avoid partial matches.
// Kept as-is (externally referenced): chatr-widget-btn, chatr-widget-panel, chatr-app,
// data-accent-color, data-accent-color-2, data-theme, data-title, data-greeting,
// ChatrWidgetConfig property names (accentColor, apiUrl, theme, etc.)
const REPLACE_MAP = [
  // ── CSS class / ID names ──────────────────────────────────────────────────
  ['chatr-tok-punctuation', '_Tp'],
  ['chatr-audio-controls', '_Ac'],
  ['chatr-w-header-avatar', '_Ha'],
  ['chatr-w-header-status', '_Hs'],
  ['chatr-w-header-name', '_Hn'],
  ['chatr-w-header-info', '_Hi'],
  ['chatr-w-status-text', '_St'],
  ['chatr-audio-bottom', '_Ab'],
  ['chatr-audio-canvas', '_Av'],
  ['chatr-widget-badge', '_Wb'],
  ['chatr-w-file-input', '_Fi'],
  ['chatr-w-name-input', '_Ni'],
  ['chatr-w-first-msg', '_Fm'],
  ['chatr-video-bubble', '_Vb'],
  ['chatr-tok-comment', '_Tc'],
  ['chatr-tok-keyword', '_Tk'],
  ['chatr-tok-operator', '_To'],
  ['chatr-file-bubble', '_Fb'],
  ['chatr-code-header', '_Ch'],
  ['chatr-tok-number', '_Tn'],
  ['chatr-tok-string', '_Ts'],
  ['chatr-audio-play', '_Ap'],
  ['chatr-img-bubble', '_Ib'],
  ['chatr-w-start-btn', '_Ws'],
  ['chatr-w-greeting', '_Wg'],
  ['chatr-w-end-btn', '_We'],
  ['chatr-tok-plain', '_Tl'],
  ['chatr-status-dot', '_Sd'],
  ['chatr-system-msg', '_Sm'],
  ['chatr-code-block', '_Cb'],
  ['chatr-code-body', '_Cd'],
  ['chatr-code-copy', '_Cc'],
  ['chatr-code-lang', '_Cl'],
  ['chatr-msg-avatar', '_Ma'],
  ['chatr-msg-bubble', '_Mb'],
  ['chatr-read-more', '_Rm'],
  ['chatr-text-clip', '_Xl'],
  ['chatr-text-fade', '_Xf'],
  ['chatr-w-attach', '_Wa'],
  ['chatr-w-footer', '_Wf'],
  ['chatr-w-header', '_Wh'],
  ['chatr-w-typing', '_Wy'],
  ['chatr-code-pre', '_Cp'],
  ['chatr-file-icon', '_Fn'],
  ['chatr-file-info', '_Fo'],
  ['chatr-file-name', '_Fe'],
  ['chatr-file-size', '_Fs'],
  ['chatr-w-close', '_Wc'],
  ['chatr-w-input', '_Wi'],
  ['chatr-w-intro', '_Wn'],
  ['chatr-spinner', '_Sp'],
  ['chatr-bounce', '_Bo'],
  ['chatr-spin', '_Sn'],
  ['chatr-ico', '_Ic'],
  ['chatr-w-body', '_Bd'],
  ['chatr-w-send', '_Se'],
  ['chatr-msg-time', '_Mt'],
  ['chatr-w-powered', '_Wp'],
  ['chatr-typing', '_Ty'],
  ['chatr-input', '_In'],
  ['chatr-label', '_Lb'],
  ['chatr-field', '_Fd'],
  ['chatr-theme', '_Th'],
  ['chatr-seek', '_Sk'],
  ['chatr-audio', '_Au'],
  ['chatr-msg', '_Mg'],
  ['chatr-btn', '_Bt'],
  ['chatr-tok-', '_T-'],

  // ── CSS custom properties (--cw-*) ────────────────────────────────────────
  ['--cw-audio-play-color', '--a'],
  ['--cw-audio-play-bg', '--b'],
  ['--cw-audio-sent-bg', '--c'],
  ['--cw-audio-bar', '--d'],
  ['--cw-powered-a', '--e'],
  ['--cw-input-bg', '--f'],
  ['--cw-greet-bg', '--g'],
  ['--cw-recv-text', '--h'],
  ['--cw-recv-bg', '--i'],
  ['--cw-powered', '--j'],
  ['--cw-border2', '--k'],
  ['--cw-border', '--l'],
  ['--cw-shadow', '--m'],
  ['--cw-scroll', '--n'],
  ['--cw-text4', '--o'],
  ['--cw-text3', '--p'],
  ['--cw-text2', '--q'],
  ['--cw-text', '--r'],
  ['--cw-bg2', '--s'],
  ['--cw-bg', '--t'],

  // ── Internal data attributes ──────────────────────────────────────────────
  ['data-chatr-theme', 'data-ct'],
  ['data-msg-id', 'data-mi'],
];

function shortenStrings(code) {
  for (const [long, short] of REPLACE_MAP) {
    code = code.split(long).join(short);
  }
  return code;
}

// Pre-Terser: inject DOM helper aliases so Terser mangles them to single chars.
// Source stays clean; this only transforms the code fed to Terser.
function injectDomAliases(src) {
  const aliases = [
    // alias, declaration, search, replace-with
    ['_$ce', 'var _$ce=document.createElement.bind(document)', 'document.createElement(', '_$ce('],
    ['_$gi', 'var _$gi=document.getElementById.bind(document)', 'document.getElementById(', '_$gi('],
    ['_$qs', 'var _$qs=document.querySelector.bind(document)', 'document.querySelector(', '_$qs('],
  ];
  // Inject declarations right after 'use strict'; inside the IIFE
  let injected = '';
  for (const [, decl, search, replacement] of aliases) {
    if (src.includes(search)) {
      injected += decl + ';';
      src = src.split(search).join(replacement);
    }
  }
  if (injected) {
    // Insert after the first 'use strict'; statement
    src = src.replace(/(['"])use strict\1;\s*/, `$&${injected}`);
  }
  return src;
}

async function minify(src) {
  try {
    const { minify: t } = require('terser');
    const r = await t(src, {
      ecma: 2015,
      compress: { passes: 3, drop_console: false, pure_getters: true, unsafe_methods: true },
      mangle: { reserved: ['ChatrWidgetConfig', 'Chatr'], toplevel: true },
      format: { comments: /^!|@license|@preserve/i },
    });
    if (r.code) return { code: r.code, tool: 'terser' };
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  let code = src
    .replace(/\/\*(?![\s\S]*?@license)[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/[^\n]*/gm, '')
    .replace(/\n{2,}/g, '\n')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  return { code, tool: 'built-in fallback (run: npm i -D terser for full minification)' };
}

function gz(str) { return zlib.gzipSync(Buffer.from(str, 'utf8')).length; }
function fmt(b)  { return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' kB'; }

async function build() {
  const src = fs.readFileSync(SRC, 'utf8');
  console.log('\n🔨  Building widget/chatr.js…');
  const prepared = injectDomAliases(src);
  const { code, tool } = await minify(prepared);
  const shortened = shortenStrings(code);
  let ver = '';
  try { ver = ' v' + require('../package.json').version; } catch (_) {}
  const banner = '/*! Chatr Widget' + ver + ' | (c) ' + new Date().getFullYear() + ' Chatr | MIT */\n';
  const out = banner + shortened;
  fs.writeFileSync(DIST, out, 'utf8');
  const rawSrc = Buffer.byteLength(src, 'utf8');
  const rawOut = Buffer.byteLength(out, 'utf8');
  const pct    = (((rawSrc - rawOut) / rawSrc) * 100).toFixed(1);
  console.log('✅  Done  (' + tool + ' + string shortening)');
  console.log('    Source  : ' + fmt(rawSrc) + '  (' + fmt(gz(src)) + ' gz)');
  console.log('    Minified: ' + fmt(rawOut) + '  (' + fmt(gz(out)) + ' gz)');
  console.log('    Saved   : ' + pct + '%\n');
}

if (process.argv.includes('--watch')) {
  console.log('👁   Watching ' + path.basename(SRC) + ' for changes…');
  build().catch(console.error);
  let debounce;
  fs.watch(SRC, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => build().catch(console.error), 150);
  });
} else {
  build().catch(function (err) { console.error('❌  Build failed:', err.message); process.exit(1); });
}
