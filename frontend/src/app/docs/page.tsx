'use client';

import { useState, useEffect, useRef, isValidElement } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Pagination from '@/components/Pagination/Pagination';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SiteNav from '@/components/site/SiteNav';
import docStyles from './Docs.module.css';

// ── Glossary term highlighting ────────────────────────────────────────────────

interface GlossaryEntry { term: string; definition: string }

function parseGlossaryMarkdown(md: string): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const rows = md.split('\n');
  for (const row of rows) {
    const m = row.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/);
    if (!m) continue;
    const term = m[1].trim();
    const definition = m[2]
      .replace(/\*In plain terms:\*/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    if (term === 'Term' || !definition) continue;
    entries.push({ term, definition });
  }
  entries.sort((a, b) => b.term.length - a.term.length);
  return entries;
}

function buildGlossaryRegex(entries: GlossaryEntry[]): RegExp | null {
  if (!entries.length) return null;
  const escaped = entries.map(e =>
    e.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

function highlightGlossaryInText(
  text: string,
  regex: RegExp,
  lookup: Map<string, string>,
  seen: Set<string>,
): (string | React.ReactElement)[] {
  regex.lastIndex = 0;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const key = matchedText.toLowerCase();
    if (seen.has(key)) continue;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    seen.add(key);
    const def = lookup.get(key) || '';
    parts.push(
      <span key={`g-${match.index}`} className={docStyles['glossary-term']}>
        {matchedText}
        <span className={docStyles['glossary-tooltip']}>{def}</span>
      </span>
    );
    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex === 0) return [text];
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function highlightGlossaryChildren(
  children: React.ReactNode,
  regex: RegExp | null,
  lookup: Map<string, string>,
  seen: Set<string>,
): React.ReactNode {
  if (!regex) return children;
  if (typeof children === 'string') {
    const result = highlightGlossaryInText(children, regex, lookup, seen);
    return result.length === 1 && typeof result[0] === 'string' ? result[0] : <>{result}</>;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        const result = highlightGlossaryInText(child, regex, lookup, seen);
        return result.length === 1 && typeof result[0] === 'string'
          ? result[0]
          : <span key={`hg-${i}`}>{result}</span>;
      }
      return child;
    });
  }
  return children;
}

// Mermaid is browser-only — load with ssr:false so webpack never bundles it for the server
const MermaidDiagram = dynamic(
  () => import('@/components/MermaidDiagram/MermaidDiagram'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '2rem', color: '#60a5fa', fontFamily: 'monospace' }}>
        Loading diagram…
      </div>
    ),
  }
);

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

// Helper to strip emojis from text
const stripEmojis = (text: string): string => {
  // Comprehensive emoji regex that catches all emoji ranges
  return text
    .replace(/[\u{1F000}-\u{1F9FF}]/gu, '') // Emoticons, symbols, pictographs
    .replace(/[\u{2600}-\u{27BF}]/gu, '')    // Miscellaneous symbols
    .replace(/[\u{2300}-\u{23FF}]/gu, '')    // Miscellaneous technical
    .replace(/[\u{2B50}]/gu, '')              // Star and other common symbols
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Miscellaneous symbols and pictographs
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and map symbols
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental symbols
    .replace(/[\u{2702}-\u{27B0}]/gu, '')    // Dingbats
    .replace(/[\u{24C2}-\u{1F251}]/gu, '')   // Enclosed characters
    .trim();
};

// Helper to process children and strip emojis from text nodes
const processChildren = (children: any): any => {
  if (typeof children === 'string') {
    return stripEmojis(children);
  }
  if (Array.isArray(children)) {
    return children.map(child => processChildren(child));
  }
  if (children && typeof children === 'object' && children.props && children.props.children) {
    // Handle React elements with children
    return {
      ...children,
      props: {
        ...children.props,
        children: processChildren(children.props.children)
      }
    };
  }
  return children;
};

// Unwrap paragraphs that contain block nodes to prevent invalid <p><pre> nesting.
const remarkUnwrapParagraphs = () => (tree: any) => {
  const isBlockChild = (node: any) => {
    return [
      'code',
      'table',
      'list',
      'heading',
      'thematicBreak',
      'blockquote',
      'html',
    ].includes(node?.type);
  };

  const visit = (node: any) => {
    if (!node?.children) return;

    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];

      if (child?.type === 'paragraph' && child.children?.some(isBlockChild)) {
        node.children.splice(i, 1, ...child.children);
        i += child.children.length - 1;
        continue;
      }

      visit(child);
    }
  };

  visit(tree);
};

interface DocFile {
  name: string;
  path: string;
}

interface DocFolder {
  name: string;
  path: string;
  children: DocStructure;
}

interface DocStructure {
  files: DocFile[];
  folders: DocFolder[];
}

export default function DocsPage() {
  const [structure, setStructure] = useState<DocStructure | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showHome, setShowHome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Only read from localStorage on client side during initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('docsSidebarWidth');
      if (saved) {
        const width = parseInt(saved, 10);
        // Validate width is within acceptable range
        if (width >= 200 && width <= 600) {
          return width;
        }
      }
    }
    return 300; // Default width
  });
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocFile[]>([]);
  const [changelogPage, setChangelogPage] = useState(1);
  const CHANGELOG_PER_PAGE = 10;
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarScrollTop = useRef(0);
  const pendingHash = useRef<string | null>(null);

  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  const [glossaryLookup, setGlossaryLookup] = useState<Map<string, string>>(new Map());
  const [glossaryRegex, setGlossaryRegex] = useState<RegExp | null>(null);

  useEffect(() => {
    fetch('/api/docs?file=GLOSSARY.md')
      .then(r => r.json())
      .then(data => {
        if (!data?.content) return;
        const entries = parseGlossaryMarkdown(data.content);
        setGlossaryEntries(entries);
        const lookup = new Map<string, string>();
        for (const e of entries) lookup.set(e.term.toLowerCase(), e.definition);
        setGlossaryLookup(lookup);
        setGlossaryRegex(buildGlossaryRegex(entries));
      })
      .catch(() => {});
  }, []);


  // Custom syntax-highlighted code block
  const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    // Language display label
    const langLabel: Record<string, string> = {
      js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', tsx: 'TSX',
      bash: 'Bash', sh: 'Shell', shell: 'Shell',
      json: 'JSON', yaml: 'YAML', yml: 'YAML',
      sql: 'SQL', prisma: 'Prisma', nginx: 'Nginx',
      css: 'CSS', html: 'HTML', md: 'Markdown',
      python: 'Python', dockerfile: 'Dockerfile',
    };
    const displayLang = language ? (langLabel[language] ?? language.toUpperCase()) : 'Plain';

    return (
      <div style={{ position: 'relative', margin: '1.25rem 0', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          padding: '6px 12px',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
            color: '#60a5fa', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace',
          }}>
            {displayLang}
          </span>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
              borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
              color: copied ? '#4ade80' : '#93c5fd',
              fontSize: '11px', fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <i className={copied ? 'fas fa-check' : 'fas fa-copy'} style={{ fontSize: '10px' }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {/* Highlighted code */}
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            fontSize: '13px',
            lineHeight: '1.6',
            padding: '1rem 1.25rem',
            overflowY: 'hidden',
          }}
          codeTagProps={{ style: { fontFamily: 'ui-monospace, "Fira Code", monospace' } }}
          showLineNumbers={code.split('\n').length > 5}
          lineNumberStyle={{ color: 'rgba(148, 163, 184, 0.35)', fontSize: '11px', minWidth: '2.5em' }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  };

  // Load documentation structure
  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        if (!data) {
          setLoading(false);
          return;
        }
        setStructure(data);

        // Collapse all folders by default
        const allFolderPaths = new Set<string>();
        const collectFolderPaths = (folders: DocFolder[]) => {
          if (!folders) return;
          folders.forEach(folder => {
            allFolderPaths.add(folder.path);
            if (folder.children?.folders) {
              collectFolderPaths(folder.children.folders);
            }
          });
        };
        collectFolderPaths(data.folders);
        setCollapsedFolders(allFolderPaths);

        setLoading(false);

        // Check for file parameter in URL, default to home view with VERSION.md
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        if (fileParam) {
          setShowHome(false);
          loadFile(fileParam);

          // Expand folders in the path
          const pathParts = fileParam.split('/');
          let currentPath = '';
          pathParts.slice(0, -1).forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            setCollapsedFolders(prev => {
              const next = new Set(prev);
              next.delete(currentPath);
              return next;
            });
          });
        } else {
          setShowHome(true);
          setContent('');
          setSelectedFile(null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error loading docs:', err);
        setLoading(false);
      });

    // Handle browser back/forward buttons
    const handlePopState = (_event: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search);
      const fileParam = urlParams.get('file');
      if (fileParam) {
        setShowHome(false);
        loadFile(fileParam);
      } else {
        setShowHome(true);
        setContent('');
        setSelectedFile(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberSidebarScroll = () => {
    if (sidebarRef.current) {
      sidebarScrollTop.current = sidebarRef.current.scrollTop;
    }
  };

  const restoreSidebarScroll = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = sidebarScrollTop.current;
    }
  };

  const resolveDocLink = (href?: string) => {
    if (!href) return null;

    if (href.startsWith('/docs')) {
      const url = new URL(href, window.location.origin);
      const file = url.searchParams.get('file');
      return file ? { filePath: file, hash: url.hash.replace('#', '') } : null;
    }

    if (/^https?:\/\//i.test(href)) return null;

    const [rawPath, rawHash] = href.split('#');
    if (!/\.md$/i.test(rawPath)) return null;

    const baseDir = selectedFile ? selectedFile.split('/').slice(0, -1) : [];
    const parts = rawPath.split('/');
    const stack = [...baseDir];

    parts.forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') {
        stack.pop();
        return;
      }
      stack.push(part);
    });

    return { filePath: stack.join('/'), hash: rawHash || '' };
  };

  // Load file content. When isHomeLoad is true, the home view with quick links is preserved.
  const loadFile = async (filePath: string, hash?: string, isHomeLoad = false) => {
    if (!isHomeLoad) setShowHome(false);
    setChangelogPage(1);
    rememberSidebarScroll();
    pendingHash.current = hash || null;
    setLoading(true);
    setSelectedFile(filePath);

    try {
      const res = await fetch(`/api/docs?file=${encodeURIComponent(filePath)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.error) {
        const status = res.status;
        const fileName = filePath.split('/').pop() || filePath;
        const folderPath = filePath.split('/').slice(0, -1).join('/');
        setContent(
          `# ${status === 404 ? '404 — File Not Found' : `${status} — Error`}\n\n` +
          `The documentation file **${fileName}** could not be found` +
          (folderPath ? ` in \`${folderPath}/\`` : '') +
          `.\n\n` +
          `**Requested path:** \`${filePath}\`\n\n` +
          `---\n\n` +
          `This file may have been moved, renamed, or deleted. Try using the sidebar or search to find what you\'re looking for.`
        );
      } else {
        setContent(data.content || '');
      }

      if (!isHomeLoad) {
        const hashSuffix = pendingHash.current ? `#${pendingHash.current}` : '';
        const newUrl = `/docs?file=${encodeURIComponent(filePath)}${hashSuffix}`;
        window.history.pushState({ filePath }, '', newUrl);
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setContent('# Error\n\nFailed to load documentation file. The server may be unavailable.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        restoreSidebarScroll();
        if (pendingHash.current) {
          scrollToHash(pendingHash.current);
        } else {
          window.scrollTo(0, 0);
        }
      });
    }
  };

  // Toggle folder collapsed state
  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };


  // Convert filename to display label
  const formatFileName = (fileName: string): string => {
    const nameWithoutExt = fileName.replace('.md', '');

    // camelCase names (hooks etc) — return as-is: useAuth, useConversation
    if (/^use[A-Z]/.test(nameWithoutExt)) {
      return nameWithoutExt;
    }

    // Split on underscores and hyphens, title-case each word, join with space
    return nameWithoutExt
      .split(/[_-]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Search through all files
  const searchFiles = (query: string, struct: DocStructure): DocFile[] => {
    const results: DocFile[] = [];
    const lowerQuery = query.toLowerCase();

    const searchInStructure = (s: DocStructure) => {
      // Search files
      s.files.forEach(file => {
        if (file.name.toLowerCase().includes(lowerQuery)) {
          results.push(file);
        }
      });

      // Search in folders recursively
      s.folders.forEach(folder => {
        if (folder.children) {
          searchInStructure(folder.children);
        }
      });
    };

    searchInStructure(struct);
    return results;
  };

  const goToPage = (page: number) => {
    if (page === changelogPage) return;
    const el = contentRef.current;
    if (el) el.style.minHeight = `${el.offsetHeight}px`;
    flushSync(() => setChangelogPage(page));
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => {
      if (el) el.style.minHeight = '';
    });
  };

  const paginateChangelog = (raw: string): { content: string; totalPages: number; totalEntries: number } => {
    const headerEnd = raw.indexOf('\n## ');
    if (headerEnd === -1) return { content: raw, totalPages: 1, totalEntries: 0 };

    const header = raw.slice(0, headerEnd);
    const rest = raw.slice(headerEnd + 1);

    const entries = rest.split(/(?=^## )/m).filter(e => e.trim());
    const totalEntries = entries.length;
    const totalPages = Math.ceil(totalEntries / CHANGELOG_PER_PAGE);
    const start = (changelogPage - 1) * CHANGELOG_PER_PAGE;
    const pageEntries = entries.slice(start, start + CHANGELOG_PER_PAGE);

    return {
      content: header + '\n' + pageEntries.join(''),
      totalPages,
      totalEntries,
    };
  };

  // Handle search input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && structure) {
      const results = searchFiles(query, structure);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const containsBlockElement = (node: unknown): boolean => {
    if (!node) return false;
    if (Array.isArray(node)) return node.some(containsBlockElement);
    if (typeof node === 'string' || typeof node === 'number') return false;
    if (!isValidElement(node)) return false;

    const element = node as { type?: unknown; props?: { children?: unknown } };
    const type = typeof element.type === 'string' ? element.type : (element.type as { name?: string })?.name;
    if (['pre', 'table', 'ul', 'ol', 'blockquote', 'div'].includes(type || '')) {
      return true;
    }

    return containsBlockElement(element.props?.children as unknown);
  };

  const scrollToHash = (hash: string) => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Set mounted flag after first render to prevent SSR/client mismatch
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setHasInteracted(true), 50);
  }, []);

  // Chrome traps wheel events inside elements with overflow-x:auto (code blocks).
  // Capture-phase handler ensures the page always scrolls vertically.
  const wheelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      if ((e.target as HTMLElement)?.closest?.('textarea, [contenteditable]')) return;
      window.scrollBy(0, e.deltaY);
    };

    el.addEventListener('wheel', handler, { capture: true, passive: true });
    return () => el.removeEventListener('wheel', handler, { capture: true });
  }, [mounted]);

  // Save sidebar width to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('docsSidebarWidth', sidebarWidth.toString());
    }
  }, [sidebarWidth, mounted]);


  // Handle sidebar resize dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = e.clientX;
        // Constrain width between 200px and 600px
        if (newWidth >= 200 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Render folder tree recursively
  const renderFolder = (folder: DocFolder, level: number = 0) => {
    const isCollapsed = collapsedFolders.has(folder.path);

    // index.md is the folder's own page — never shown as a child file item
    const indexFile = folder.children.files.find(f =>
      f.name.toLowerCase() === 'index.md' || f.name.toLowerCase() === 'readme.md'
    );
    const otherFiles = folder.children.files.filter(f =>
      f.name.toLowerCase() !== 'index.md' && f.name.toLowerCase() !== 'readme.md'
    );

    // Only show the triangle when there are children to expand
    const hasChildren = otherFiles.length > 0 || folder.children.folders.length > 0;

    // Is this folder's index currently selected?
    const isActive = indexFile ? selectedFile === indexFile.path : false;

    return (
      <div key={folder.path}>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (indexFile) loadFile(indexFile.path);
            if (hasChildren) toggleFolder(folder.path);
          }}
          style={{
            paddingTop: '0.35rem',
            paddingBottom: '0.35rem',
            paddingRight: '0.5rem',
            paddingLeft: `${0.5 + level}rem`,
            color: isActive ? 'var(--orange-500)' : 'var(--blue-200)',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderRadius: '0.25rem',
            background: isActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            minWidth: 0,
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Icon — same 10px wide for both triangle and bullet so text always aligns */}
          <span style={{ fontSize: '0.55rem', flexShrink: 0, width: '10px', textAlign: 'center', opacity: 0.7, display: 'inline-block' }}>
            {hasChildren ? (isCollapsed ? '▶' : '▼') : '●'}
          </span>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}>{folder.name}</span>
        </div>
        {!isCollapsed && hasChildren && (
          <div>
            {otherFiles.map(file => renderFile(file, level + 1))}
            {folder.children.folders.map(subFolder => renderFolder(subFolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render file item
  const renderFile = (file: DocFile, level: number = 0) => (
    <div
      key={file.path}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        loadFile(file.path);
      }}
      style={{
        paddingTop: '0.35rem',
        paddingBottom: '0.35rem',
        paddingRight: '0.5rem',
        paddingLeft: `${0.5 + level}rem`,
        color: selectedFile === file.path ? 'var(--orange-500)' : 'var(--blue-300)',
        fontSize: '0.875rem',
        cursor: 'pointer',
        borderRadius: '0.25rem',
        background: selectedFile === file.path ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (selectedFile !== file.path) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
      }}
      onMouseLeave={(e) => {
        if (selectedFile !== file.path) e.currentTarget.style.background = 'transparent';
      }}
      title={formatFileName(file.name)}
    >
      <span style={{ fontSize: '0.55rem', flexShrink: 0, width: '10px', textAlign: 'center', opacity: 0.5, display: 'inline-block' }}>–</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {formatFileName(file.name)}
      </span>
    </div>
  );

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <SiteNav />
      <main id="main-content" style={{ paddingTop: 64 }}>
      {/* Show loading screen until mounted and width is loaded */}
      {!mounted ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100vh',
          background: 'var(--bg-primary)',
        }}>
          <div style={{
            textAlign: 'center',
            color: 'var(--blue-300)',
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}>
              <i className="fas fa-book"></i>
            </div>
            <div>Loading documentation...</div>
          </div>
        </div>
      ) : (
        <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={docStyles.sidebar}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : '0',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: (isDragging || !hasInteracted) ? 'none' : 'width 0.3s ease-in-out',
          position: 'fixed',
          top: 64,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{
          padding: '1.5rem',
          opacity: sidebarOpen ? 1 : 0,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-30px)',
          transition: hasInteracted ? 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out' : 'none',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
        }}>
            {/* Search Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={docStyles.sidebarSearch}
              />
              {searchQuery && (
                <div style={{
                  color: 'var(--blue-300)',
                  fontSize: '0.75rem',
                  marginTop: '0.5rem'
                }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            {searchQuery ? (
              // Show search results
              <div>
                {searchResults.length > 0 ? (
                  <div>
                    <div style={{
                      color: 'var(--blue-200)',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      marginBottom: '0.5rem'
                    }}>
                      Search Results
                    </div>
                    {searchResults.map(file => (
                      <div
                        key={file.path}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          loadFile(file.path);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        style={{
                          padding: '0.5rem',
                          color: selectedFile === file.path ? 'var(--orange-500)' : 'var(--blue-300)',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          borderRadius: '0.25rem',
                          background: selectedFile === file.path ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                          transition: 'all 0.2s',
                          marginBottom: '0.25rem'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFile !== file.path) {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFile !== file.path) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>📄 {formatFileName(file.name)}</div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--blue-400)',
                          marginTop: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {file.path}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    color: 'var(--blue-300)',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    padding: '2rem 0'
                  }}>
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            ) : structure ? (
              // Show folder tree
              <div>
                {/* Filter out index/readme files from root level */}
                {structure.files
                  .filter(file => file.name.toLowerCase() !== 'readme.md' && file.name.toLowerCase() !== 'index.md')
                  .map(file => renderFile(file, 0))}
                {structure.folders.map(folder => renderFolder(folder, 0))}
              </div>
            ) : (
              <div style={{ color: 'var(--blue-300)' }}>No documentation found</div>
            )}

            <div className={docStyles.sidebarDivider} style={{ marginTop: '2rem', paddingTop: '1rem' }}>
              <Link
                href="/"
                style={{
                  color: 'var(--blue-300)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--blue-100)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--blue-300)'}
              >
                ← Back to Home
              </Link>
            </div>
          </div>

        {/* Draggable Resize Handle */}
        {sidebarOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              background: isDragging ? 'rgba(249, 115, 22, 0.5)' : 'transparent',
              transition: 'background 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          />
        )}
      </div>

      {/* Main Content */}
      <div ref={wheelRef} style={{
        position: 'relative',
        marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0',
        transition: (isDragging || !hasInteracted) ? 'none' : 'margin-left 0.3s ease-in-out',
      }}>
        {/* Breadcrumb bar with sidebar toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.5rem',
          fontSize: '0.85rem',
          color: 'var(--blue-300)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          position: 'sticky',
          top: 64,
          zIndex: 1001,
          background: 'var(--bg-primary)',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={docStyles.toggleBtn}
            style={{
              padding: '0.25rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.5rem',
              height: '1.5rem',
              lineHeight: '1',
              flexShrink: 0,
            }}
            title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {sidebarOpen ? '«' : '»'}
          </button>
          <span style={{ color: 'rgba(59, 130, 246, 0.3)', userSelect: 'none' }}>|</span>
          <a
            href="/docs"
            onClick={(e) => {
              e.preventDefault();
              setShowHome(true);
              setSelectedFile(null);
              setContent('');
              window.history.pushState({}, '', '/docs');
              window.scrollTo(0, 0);
            }}
            style={{
              color: 'var(--blue-300)',
              textDecoration: 'none',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f97316'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--blue-300)'}
          >
            &lt; Documentation
          </a>
          {selectedFile && !showHome && (() => {
            const parts = selectedFile.split('/');
            const folders = parts.slice(0, -1);
            const file = parts[parts.length - 1];
            return (
              <>
                {folders.map((folder, i) => {
                  const folderPath = folders.slice(0, i + 1).join('/');
                  const indexPath = `${folderPath}/index.md`;
                  return (
                    <span key={folderPath} style={{ display: 'contents' }}>
                      <span style={{ color: 'rgba(59, 130, 246, 0.3)', userSelect: 'none' }}>—</span>
                      <a
                        href={`/docs?file=${encodeURIComponent(indexPath)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          loadFile(indexPath);
                        }}
                        style={{
                          color: 'var(--blue-300)',
                          textDecoration: 'none',
                          transition: 'color 0.15s',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#f97316'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--blue-300)'}
                      >
                        {folder.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </a>
                    </span>
                  );
                })}
                <span style={{ color: 'rgba(59, 130, 246, 0.3)', userSelect: 'none' }}>—</span>
                <span style={{ color: 'var(--blue-100)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatFileName(file)}
                </span>
              </>
            );
          })()}
        </div>

        <div style={{
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: '0.5rem 3rem 3rem 3.5rem',
          position: 'relative',
        }}>
          {loading ? (
            <div style={{
              textAlign: 'center',
              color: 'var(--blue-300)',
              padding: '3rem'
            }}>
              Loading documentation...
            </div>
          ) : (
            <>
              {showHome && (
                <div style={{ padding: '2rem 0 1rem' }}>
                  <h1 style={{
                    color: 'var(--blue-100)',
                    fontSize: '2.5rem',
                    marginBottom: '0.5rem',
                    textAlign: 'center',
                  }}>
                    {PRODUCT_NAME} Documentation
                  </h1>
                  <p style={{
                    color: 'var(--blue-300)',
                    fontSize: '1.125rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                  }}>
                    Select a document from the sidebar or quick links below
                  </p>
                  <div
                    className={docStyles.quickLinksBox}
                    style={{
                      borderRadius: '0.5rem',
                      padding: '1.5rem 2rem',
                      marginBottom: '2rem',
                    }}
                  >
                    <h3 style={{
                      color: 'var(--blue-100)',
                      marginBottom: '0.75rem'
                    }}>
                      <i className="fad fa-book" style={{ marginRight: '0.5rem' }} />
                      Quick Links
                    </h3>
                    <ul style={{
                      color: 'var(--blue-300)',
                      lineHeight: '2.2',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '0 2rem',
                    }}>
                      {[
                        { label: 'Version History', file: 'VERSION.md', icon: 'fa-clock-rotate-left' },
                        { label: 'Getting Started', file: 'GETTING_STARTED.md', icon: 'fa-rocket' },
                        { label: 'Project Overview', file: 'index.md', icon: 'fa-home' },
                        { label: 'Architecture', file: 'Architecture/index.md', icon: 'fa-sitemap' },
                        { label: 'Local Setup', file: 'Getting-Started/LOCAL_SETUP.md', icon: 'fa-terminal' },
                        { label: 'REST API Reference', file: 'API/REST_API.md', icon: 'fa-plug' },
                        { label: 'WebSocket Events', file: 'WebSocket/EVENTS.md', icon: 'fa-bolt' },
                        { label: 'Database Schema', file: 'Database/SCHEMA.md', icon: 'fa-database' },
                        { label: 'Frontend', file: 'Frontend/index.md', icon: 'fa-browser' },
                        { label: 'Backend', file: 'Backend/index.md', icon: 'fa-server' },
                        { label: 'Authentication', file: 'Backend/AUTHENTICATION.md', icon: 'fa-lock' },
                        { label: 'Messaging Features', file: 'Features/MESSAGING.md', icon: 'fa-comments' },
                        { label: 'Voice Calls', file: 'Features/VOICE_CALLS.md', icon: 'fa-phone' },
                        { label: 'Widget', file: 'Widget/index.md', icon: 'fa-puzzle-piece' },
                        { label: 'Testing', file: 'Testing/index.md', icon: 'fa-flask' },
                        { label: 'Deployment', file: 'Getting-Started/DEPLOYMENT.md', icon: 'fa-cloud-upload' },
                        { label: 'Glossary', file: 'GLOSSARY.md', icon: 'fa-book' },
                        { label: 'Factory: TURN Server', file: 'Factory/TURN_SERVER.md', icon: 'fa-industry' },
                      ].map(link => (
                        <li key={link.file}>
                          <a
                            href={`/docs?file=${encodeURIComponent(link.file)}`}
                            onClick={(e) => {
                              e.preventDefault();
                              loadFile(link.file);
                            }}
                            style={{
                              color: 'var(--blue-300)',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'color 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#f97316'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--blue-300)'}
                          >
                            <i className={`fad ${link.icon}`} style={{ width: '1.2em', textAlign: 'center' }} />
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content && (() => {
                const isChangelog = selectedFile === 'VERSION.md';
                const isGlossary = selectedFile === 'GLOSSARY.md';
                const paginated = isChangelog ? paginateChangelog(content) : null;
                const displayContent = paginated ? paginated.content : content;
                const gSeen = new Set<string>();
                const gRegex = isGlossary ? null : glossaryRegex;
                const gHighlight = (children: React.ReactNode) =>
                  highlightGlossaryChildren(children, gRegex, glossaryLookup, gSeen);

                return (
                <div ref={isChangelog ? contentRef : undefined}>
                  {isChangelog && paginated && paginated.totalPages > 1 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <Pagination
                        currentPage={changelogPage}
                        totalPages={paginated.totalPages}
                        onPageChange={goToPage}
                      />
                    </div>
                  )}
                <div className={docStyles['markdown-content']}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkUnwrapParagraphs]}
                    rehypePlugins={[
                      rehypeSlug,
                      [rehypeAutolinkHeadings, {
                        behavior: 'append',
                        properties: {
                          className: 'heading-anchor',
                          ariaLabel: 'Link to section'
                        },
                        content: {
                          type: 'element',
                          tagName: 'span',
                          properties: { className: 'anchor-icon' },
                          children: [{ type: 'text', value: ' #' }]
                        }
                      }]
                    ]}
                    components={{
                      h1: ({ children, ...props }) => <h1 {...props}>{processChildren(children)}</h1>,
                      h2: ({ children, ...props }) => <h2 {...props}>{processChildren(children)}</h2>,
                      h3: ({ children, ...props }) => <h3 {...props}>{processChildren(children)}</h3>,
                      h4: ({ children, ...props }) => <h4 {...props}>{processChildren(children)}</h4>,
                      h5: ({ children, ...props }) => <h5 {...props}>{processChildren(children)}</h5>,
                      h6: ({ children, ...props }) => <h6 {...props}>{processChildren(children)}</h6>,
                      a: ({ href, children, ...props }) => {
                        if (href?.startsWith('#')) {
                          return (
                            <a
                              href={href}
                              {...props}
                              onClick={(event) => {
                                event.preventDefault();
                                window.history.replaceState({}, '', `/docs${window.location.search}${href}`);
                                scrollToHash(href);
                              }}
                            >
                              {children}
                            </a>
                          );
                        }

                        const resolved = resolveDocLink(href);
                        if (resolved?.filePath) {
                          const hashSuffix = resolved.hash ? `#${resolved.hash}` : '';
                          const url = `/docs?file=${encodeURIComponent(resolved.filePath)}${hashSuffix}`;
                          return (
                            <Link
                              href={url}
                              {...props}
                              onClick={(event) => {
                                event.preventDefault();
                                loadFile(resolved.filePath, resolved.hash || undefined);
                              }}
                            >
                              {children}
                            </Link>
                          );
                        }
                        return (
                          <a href={href} {...props}>
                            {children}
                          </a>
                        );
                      },
                      p: ({ children, ...props }) => {
                        if (containsBlockElement(children)) {
                          return <>{children}</>;
                        }
                        return <p {...props}>{gHighlight(children)}</p>;
                      },
                      li: ({ children, ...props }) => (
                        <li {...props}>{gHighlight(children)}</li>
                      ),
                      td: ({ children, ...props }) => (
                        <td {...props}>{gHighlight(children)}</td>
                      ),
                      pre: ({ children }: any) => {
                        const child = Array.isArray(children) ? children[0] : children;
                        const className = child?.props?.className || '';
                        const match = /language-(\w+)/.exec(className);
                        const language = match ? match[1] : '';
                        const codeText = typeof child?.props?.children === 'string'
                          ? child.props.children.replace(/\n$/, '')
                          : '';

                        if (language === 'mermaid') {
                          return <MermaidDiagram chart={codeText} />;
                        }

                        return <CodeBlock language={language} code={codeText} />;
                      },
                      code: ({ inline, className, children, ...props }: any) => {
                        if (inline) {
                          return (
                            <code
                              className={className}
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '0.25rem',
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }

                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
                  {isChangelog && paginated && paginated.totalPages > 1 && (
                    <div style={{ marginTop: '2rem' }}>
                      <Pagination
                        currentPage={changelogPage}
                        totalPages={paginated.totalPages}
                        onPageChange={goToPage}
                      />
                    </div>
                  )}
                </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
      </>
      )}
      </main>
      <footer style={{
        borderTop: '1px solid var(--border-primary)',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-tertiary)',
      }}>
        <span>&copy; {new Date().getFullYear()} Chatr. MIT License.</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Home</a>
          <a href="/features" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Features</a>
          <a href="/pricing" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Pricing</a>
          <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>GitHub</a>
          <a href="/contact" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

