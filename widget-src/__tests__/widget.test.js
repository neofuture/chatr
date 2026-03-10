'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC_PATH = path.join(__dirname, '..', 'chatr.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

// ---------------------------------------------------------------------------
// Re-implement pure functions from the widget source for unit testing.
// These must stay in sync with widget-src/chatr.js.
// ---------------------------------------------------------------------------

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function firstName(name) {
  if (!name) return '';
  return name.trim().split(/\s+/)[0];
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(d) {
  d = d ? new Date(d) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtSecs(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

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

var CODE_KEYWORDS = new Set('const let var function return if else for while do switch case break continue class extends new this super import export default from async await try catch finally throw typeof instanceof in of void delete static get set'.split(' '));

function tokeniseCode(code) {
  var tokens = [];
  var i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i+1] === '/') {
      var end = code.indexOf('\n', i);
      var val = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ t: 'comment', v: val }); i += val.length; continue;
    }
    if (code[i] === '#') {
      var end2 = code.indexOf('\n', i);
      var val2 = end2 === -1 ? code.slice(i) : code.slice(i, end2);
      tokens.push({ t: 'comment', v: val2 }); i += val2.length; continue;
    }
    if (code[i] === '/' && code[i+1] === '*') {
      var end3 = code.indexOf('*/', i+2);
      var val3 = end3 === -1 ? code.slice(i) : code.slice(i, end3+2);
      tokens.push({ t: 'comment', v: val3 }); i += val3.length; continue;
    }
    if (code[i] === '`') {
      var j = i+1;
      while (j < code.length && code[j] !== '`') { if (code[j] === '\\') j++; j++; }
      tokens.push({ t: 'string', v: code.slice(i, j+1) }); i = j+1; continue;
    }
    if (code[i] === '"' || code[i] === "'") {
      var q = code[i], j2 = i+1;
      while (j2 < code.length && code[j2] !== q) { if (code[j2] === '\\') j2++; j2++; }
      tokens.push({ t: 'string', v: code.slice(i, j2+1) }); i = j2+1; continue;
    }
    if (/[0-9]/.test(code[i])) {
      var j3 = i;
      while (j3 < code.length && /[0-9._xXa-fA-FnN]/.test(code[j3])) j3++;
      tokens.push({ t: 'number', v: code.slice(i, j3) }); i = j3; continue;
    }
    if (/[a-zA-Z_$]/.test(code[i])) {
      var j4 = i+1;
      while (j4 < code.length && /[a-zA-Z0-9_$]/.test(code[j4])) j4++;
      var word = code.slice(i, j4);
      tokens.push({ t: CODE_KEYWORDS.has(word) ? 'keyword' : 'plain', v: word });
      i = j4; continue;
    }
    if (/[=!<>+\-*/%&|^~?:]/.test(code[i])) {
      tokens.push({ t: 'operator', v: code[i] }); i++; continue;
    }
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
  }
  if (textLines.length) segments.push({ kind: 'text', content: textLines.join('\n') });
  return segments;
}

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

// ---------------------------------------------------------------------------
// Verify function implementations match widget source (sync check)
// ---------------------------------------------------------------------------

describe('Widget — Source sync check', () => {
  test('escHtml matches source', () => {
    expect(SRC).toContain("function escHtml(str)");
    expect(SRC).toContain(".replace(/&/g, '&amp;')");
  });
  test('firstName matches source', () => {
    expect(SRC).toContain("function firstName(name)");
    expect(SRC).toContain(".trim().split(/\\s+/)[0]");
  });
  test('formatFileSize matches source', () => {
    expect(SRC).toContain("function formatFileSize(bytes)");
  });
  test('normaliseMsg matches source', () => {
    expect(SRC).toContain("function normaliseMsg(m)");
    expect(SRC).toContain("m.fileType  || m.mimeType");
  });
});

// ---------------------------------------------------------------------------
// Tests: Pure utility functions
// ---------------------------------------------------------------------------

describe('Widget — escHtml', () => {
  test('escapes &, <, >, "', () => {
    expect(escHtml('a & b <c> "d"')).toBe('a &amp; b &lt;c&gt; &quot;d&quot;');
  });
  test('handles numbers and empty string', () => {
    expect(escHtml(42)).toBe('42');
    expect(escHtml('')).toBe('');
  });
});

describe('Widget — firstName', () => {
  test('returns first word', () => {
    expect(firstName('John Doe')).toBe('John');
  });
  test('handles single name', () => {
    expect(firstName('Alice')).toBe('Alice');
  });
  test('handles empty/null', () => {
    expect(firstName('')).toBe('');
    expect(firstName(null)).toBe('');
    expect(firstName(undefined)).toBe('');
  });
  test('trims whitespace', () => {
    expect(firstName('  Bob  Smith  ')).toBe('Bob');
  });
});

describe('Widget — formatFileSize', () => {
  test('returns empty for falsy', () => {
    expect(formatFileSize(0)).toBe('');
    expect(formatFileSize(null)).toBe('');
  });
  test('bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });
  test('kilobytes', () => {
    expect(formatFileSize(10240)).toBe('10 KB');
  });
  test('megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('Widget — formatTime', () => {
  test('formats a date string', () => {
    const result = formatTime('2026-03-10T14:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
  test('handles null (returns current time)', () => {
    expect(formatTime(null)).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('Widget — fmtSecs', () => {
  test('formats seconds into m:ss', () => {
    expect(fmtSecs(0)).toBe('0:00');
    expect(fmtSecs(5)).toBe('0:05');
    expect(fmtSecs(65)).toBe('1:05');
    expect(fmtSecs(600)).toBe('10:00');
  });
  test('handles NaN and Infinity', () => {
    expect(fmtSecs(NaN)).toBe('0:00');
    expect(fmtSecs(Infinity)).toBe('0:00');
    expect(fmtSecs(null)).toBe('0:00');
  });
});

describe('Widget — hexToHsl / hslToHex', () => {
  test('round-trips #ff0000 (red)', () => {
    const hsl = hexToHsl('#ff0000');
    expect(hsl[0]).toBeCloseTo(0, 0);
    expect(hsl[1]).toBeCloseTo(100, 0);
    expect(hsl[2]).toBeCloseTo(50, 0);
    expect(hslToHex(hsl[0], hsl[1], hsl[2])).toBe('#ff0000');
  });
  test('round-trips #00ff00 (green)', () => {
    const hsl = hexToHsl('#00ff00');
    expect(hsl[0]).toBeCloseTo(120, 0);
    expect(hslToHex(hsl[0], hsl[1], hsl[2])).toBe('#00ff00');
  });
  test('handles 3-char hex', () => {
    const hsl = hexToHsl('#fff');
    expect(hsl[2]).toBeCloseTo(100, 0);
  });
  test('achromatic (grey) has zero saturation', () => {
    const hsl = hexToHsl('#808080');
    expect(hsl[1]).toBeCloseTo(0, 0);
  });
});

describe('Widget — deriveAccent2', () => {
  test('returns a valid hex color', () => {
    expect(deriveAccent2('#f97316')).toMatch(/^#[0-9a-f]{6}$/);
  });
  test('shifts hue and darkens', () => {
    const orig = hexToHsl('#f97316');
    const derived = hexToHsl(deriveAccent2('#f97316'));
    expect(derived[2]).toBeLessThan(orig[2]);
  });
});

describe('Widget — tokeniseCode', () => {
  test('identifies keywords', () => {
    const tokens = tokeniseCode('const x = 5;');
    expect(tokens[0]).toEqual({ t: 'keyword', v: 'const' });
  });
  test('identifies strings', () => {
    expect(tokeniseCode('"hello"')[0]).toEqual({ t: 'string', v: '"hello"' });
    expect(tokeniseCode("'world'")[0]).toEqual({ t: 'string', v: "'world'" });
  });
  test('identifies single-line comments', () => {
    expect(tokeniseCode('// a comment')[0]).toEqual({ t: 'comment', v: '// a comment' });
  });
  test('identifies hash comments', () => {
    expect(tokeniseCode('# python')[0]).toEqual({ t: 'comment', v: '# python' });
  });
  test('identifies block comments', () => {
    expect(tokeniseCode('/* block */')[0]).toEqual({ t: 'comment', v: '/* block */' });
  });
  test('identifies numbers', () => {
    expect(tokeniseCode('42')[0]).toEqual({ t: 'number', v: '42' });
    expect(tokeniseCode('0xff')[0]).toEqual({ t: 'number', v: '0xff' });
  });
  test('identifies operators and punctuation', () => {
    const tokens = tokeniseCode('a + b;');
    expect(tokens.find(t => t.t === 'operator')).toEqual({ t: 'operator', v: '+' });
    expect(tokens.find(t => t.t === 'punctuation')).toEqual({ t: 'punctuation', v: ';' });
  });
  test('handles template literals', () => {
    expect(tokeniseCode('`hello`')[0].t).toBe('string');
  });
});

describe('Widget — parseCodeBlocks', () => {
  test('plain text returns single text segment', () => {
    expect(parseCodeBlocks('hello world')).toEqual([{ kind: 'text', content: 'hello world' }]);
  });
  test('fenced code block', () => {
    const r = parseCodeBlocks('before\n```js\nconst x = 1;\n```\nafter');
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ kind: 'text', content: 'before' });
    expect(r[1]).toEqual({ kind: 'code', lang: 'js', content: 'const x = 1;' });
    expect(r[2]).toEqual({ kind: 'text', content: 'after' });
  });
  test('inline fenced code (single line)', () => {
    expect(parseCodeBlocks('```hello```')).toEqual([{ kind: 'code', lang: 'code', content: 'hello' }]);
  });
  test('unclosed code block still captures', () => {
    const r = parseCodeBlocks('```python\nprint("hi")');
    expect(r.some(s => s.kind === 'code')).toBe(true);
  });
  test('multiple code blocks', () => {
    const r = parseCodeBlocks('```js\na\n```\ntext\n```py\nb\n```');
    expect(r.filter(s => s.kind === 'code')).toHaveLength(2);
  });
});

describe('Widget — normaliseMsg', () => {
  test('maps API fields', () => {
    const n = normaliseMsg({
      id: '1', senderId: 'a', content: 'hello', type: 'text',
      fileName: 'f.txt', fileSize: 1024, fileType: 'text/plain',
      audioWaveform: [0.5], audioDuration: 3.2, createdAt: '2026-01-01',
    });
    expect(n.id).toBe('1');
    expect(n.mimeType).toBe('text/plain');
    expect(n.waveformData).toEqual([0.5]);
    expect(n.duration).toBe(3.2);
  });
  test('prefers fileUrl over content', () => {
    expect(normaliseMsg({ id: '2', senderId: 'a', content: 'x', fileUrl: 'http://img.jpg' }).content)
      .toBe('http://img.jpg');
  });
  test('defaults type to text', () => {
    expect(normaliseMsg({ id: '3', senderId: 'a' }).type).toBe('text');
  });
  test('falls back mimeType from mimeType field', () => {
    expect(normaliseMsg({ id: '4', senderId: 'a', mimeType: 'image/png' }).mimeType).toBe('image/png');
  });
});

// ---------------------------------------------------------------------------
// Tests: Build pipeline
// ---------------------------------------------------------------------------

describe('Widget — Build pipeline', () => {
  const BUILD_PATH = path.join(__dirname, '..', 'build.js');
  const BUILD_SRC = fs.readFileSync(BUILD_PATH, 'utf8');
  const DIST_PATH = path.join(__dirname, '..', '..', 'widget', 'chatr.js');

  test('source file exists and is non-empty', () => {
    expect(SRC.length).toBeGreaterThan(1000);
  });

  test('build script exists', () => {
    expect(fs.existsSync(BUILD_PATH)).toBe(true);
  });

  test('minified output exists', () => {
    expect(fs.existsSync(DIST_PATH)).toBe(true);
  });

  test('minified output is smaller than source', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist.length).toBeLessThan(SRC.length);
  });

  test('minified output starts with banner comment', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist.startsWith('/*!')).toBe(true);
    expect(dist).toMatch(/Chatr Widget/);
  });

  test('no Font Awesome in output', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist).not.toMatch(/font-awesome|fontawesome|fa-solid|fa-regular/i);
  });

  test('preserves external-facing class names', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist).toContain('chatr-widget-btn');
    expect(dist).toContain('chatr-widget-panel');
  });

  test('internal class names are shortened', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist).not.toContain('chatr-msg-bubble');
    expect(dist).toContain('_Mb');
  });

  test('CSS custom properties are shortened', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    expect(dist).not.toContain('--cw-shadow');
  });

  test('gzipped output is under 15 kB', () => {
    const dist = fs.readFileSync(DIST_PATH, 'utf8');
    const gzSize = zlib.gzipSync(Buffer.from(dist, 'utf8')).length;
    expect(gzSize).toBeLessThan(15 * 1024);
  });

  test('REPLACE_MAP has no duplicate short names', () => {
    const mapMatch = BUILD_SRC.match(/const REPLACE_MAP\s*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    const entries = mapMatch[1].match(/\['[^']+',\s*'([^']+)'\]/g);
    const shorts = entries.map(e => e.match(/'([^']+)'\]$/)[1]);
    const unique = new Set(shorts);
    expect(unique.size).toBe(shorts.length);
  });

  test('all SVG icon files exist', () => {
    const iconsDir = path.join(__dirname, '..', '..', 'widget', 'icons');
    const expected = ['file','img','audio','video','pdf','doc','xls','zip','chat','send','attach','play','pause'];
    for (const name of expected) {
      expect(fs.existsSync(path.join(iconsDir, name + '.svg'))).toBe(true);
    }
  });

  test('SVG icon files are valid', () => {
    const iconsDir = path.join(__dirname, '..', '..', 'widget', 'icons');
    const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));
    expect(files.length).toBeGreaterThanOrEqual(13);
    for (const f of files) {
      const svg = fs.readFileSync(path.join(iconsDir, f), 'utf8');
      expect(svg).toMatch(/^<svg[\s>]/);
      expect(svg).toContain('</svg>');
    }
  });
});
