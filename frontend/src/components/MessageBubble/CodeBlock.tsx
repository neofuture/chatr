'use client';

import { useState, useCallback } from 'react';
import styles from './CodeBlock.module.css';

// ── Minimal tokeniser ────────────────────────────────────────────────────────
// Covers: strings, comments, keywords, numbers, booleans/null, operators, punctuation

const KEYWORDS = new Set([
  // JS/TS
  'const','let','var','function','return','if','else','for','while','do','switch','case',
  'break','continue','class','extends','new','this','super','import','export','default',
  'from','async','await','try','catch','finally','throw','typeof','instanceof','in','of',
  'void','delete','static','get','set','public','private','protected','readonly',
  'interface','type','enum','namespace','declare','abstract','implements','as','is',
  // Python
  'def','lambda','pass','None','True','False','and','or','not','with','yield',
  'global','nonlocal','assert','raise','except','elif',
  // Rust / Go / general
  'fn','let','mut','use','mod','struct','impl','trait','where','match','Some','Ok','Err',
  'func','go','defer','chan','map','range','select','package',
  // General
  'null','undefined','true','false','NaN','Infinity',
]);

type TokenType = 'comment' | 'string' | 'keyword' | 'number' | 'boolean' | 'operator' | 'punctuation' | 'plain';

interface Token { type: TokenType; value: string }

function tokenise(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-line comment //
    if (code[i] === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const val = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'comment', value: val });
      i += val.length;
      continue;
    }
    // Hash comment #
    if (code[i] === '#') {
      const end = code.indexOf('\n', i);
      const val = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'comment', value: val });
      i += val.length;
      continue;
    }
    // Multi-line comment /* ... */
    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const val = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ type: 'comment', value: val });
      i += val.length;
      continue;
    }
    // Template literal `...`
    if (code[i] === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== '`') {
        if (code[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // String ' or "
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== q) {
        if (code[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(code[i]) || (code[i] === '-' && /[0-9]/.test(code[i + 1] ?? ''))) {
      let j = i + (code[i] === '-' ? 1 : 0);
      while (j < code.length && /[0-9._xXa-fA-FnN]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Word (keyword or identifier)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i + 1;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      tokens.push({ type: KEYWORDS.has(word) ? 'keyword' : 'plain', value: word });
      i = j;
      continue;
    }
    // Operator
    if (/[=!<>+\-*/%&|^~?:]/.test(code[i])) {
      tokens.push({ type: 'operator', value: code[i] });
      i++;
      continue;
    }
    // Punctuation
    if (/[{}()[\];,.]/.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }
    // Anything else (whitespace, newlines)
    tokens.push({ type: 'plain', value: code[i] });
    i++;
  }
  return tokens;
}

// ── Parse message content into segments (plain text + code blocks) ────────────

interface TextSegment { kind: 'text'; content: string }
interface CodeSegment  { kind: 'code';  lang: string; content: string }
type Segment = TextSegment | CodeSegment;

export function parseCodeBlocks(text: string): Segment[] {
  const segments: Segment[] = [];
  const lines = text.split('\n');

  let inCode = false;
  let lang = '';
  let codeLines: string[] = [];
  let textLines: string[] = [];

  const flushText = () => {
    if (textLines.length === 0) return;
    const content = textLines.join('\n');
    // Only push non-empty text segments
    if (content.length > 0) segments.push({ kind: 'text', content });
    textLines = [];
  };

  const flushCode = () => {
    segments.push({ kind: 'code', lang: lang || 'text', content: codeLines.join('\n') });
    codeLines = [];
    lang = '';
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inCode) {
      // Opening fence: line starts with ``` (3+ backticks)
      if (/^`{3,}/.test(trimmed)) {
        flushText();
        // Extract optional language after the backticks
        lang = trimmed.replace(/^`+/, '').trim();
        inCode = true;
        continue;
      }
      textLines.push(line);
    } else {
      // Closing fence: line is ONLY backticks (2 or more) — handles ``, ```, ```` etc.
      if (/^`{2,}\s*$/.test(trimmed)) {
        flushCode();
        inCode = false;
        continue;
      }
      codeLines.push(line);
    }
  }

  // Unclosed block — render what we have rather than dumping raw backticks
  if (inCode && codeLines.length > 0) {
    flushCode();
  } else {
    flushText();
  }

  return segments;
}

// ── CodeBlock component ──────────────────────────────────────────────────────

interface CodeBlockProps {
  lang: string;
  content: string;
}

export default function CodeBlock({ lang, content }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const tokens = tokenise(content);

  return (
    <div className={styles.codeBlock}>
      {/* Header bar */}
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{lang || 'code'}</span>
        <button
          className={styles.copyBtn}
          onClick={e => { e.stopPropagation(); handleCopy(); }}
          aria-label="Copy code"
        >
          {copied
            ? <><i className="fas fa-check" /> Copied!</>
            : <><i className="fas fa-copy" /> Copy</>
          }
        </button>
      </div>
      {/* Code body */}
      <pre className={styles.codePre}>
        <code className={styles.codeBody}>
          {tokens.map((tok, idx) => (
            <span key={idx} className={styles[tok.type]}>
              {tok.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

