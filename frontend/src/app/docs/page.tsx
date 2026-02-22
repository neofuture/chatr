'use client';

import { useState, useEffect, useRef, isValidElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import mermaid from 'mermaid';

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
  const [isTogglingsidebar, setIsTogglingsidebar] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocFile[]>([]);
  const mermaidInitialized = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarScrollTop = useRef(0);
  const pendingHash = useRef<string | null>(null);

  // Initialize mermaid
  useEffect(() => {
    if (!mermaidInitialized.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#e0f2fe',
          primaryBorderColor: '#3b82f6',
          lineColor: '#3b82f6',
          secondaryColor: '#f97316',
          tertiaryColor: '#1e3a5f',
          background: '#0f172a',
          mainBkg: '#1e293b',
          secondBkg: '#334155',
          textColor: '#e0f2fe',
          border1: '#3b82f6',
          border2: '#f97316',
          arrowheadColor: '#3b82f6',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '14px',
        },
        securityLevel: 'loose',
      });
      mermaidInitialized.current = true;
    }
  }, []);

  // Custom Mermaid component
  const MermaidDiagram = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');

    useEffect(() => {
      const renderDiagram = async () => {
        if (ref.current && chart) {
          try {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(id, chart);
            setSvg(svg);
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            setSvg(`<pre style="color: #ef4444;">Error rendering diagram: ${error}</pre>`);
          }
        }
      };
      renderDiagram();
    }, [chart]);

    return (
      <div
        ref={ref}
        className="mermaid-diagram"
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '2rem',
          borderRadius: '0.5rem',
          margin: '2rem 0',
          overflow: 'auto',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  };

  // Load documentation structure
  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        setStructure(data);

        // Collapse all folders by default
        const allFolderPaths = new Set<string>();
        const collectFolderPaths = (folders: DocFolder[]) => {
          folders.forEach(folder => {
            allFolderPaths.add(folder.path);
            if (folder.children && folder.children.folders) {
              collectFolderPaths(folder.children.folders);
            }
          });
        };
        if (data.folders) {
          collectFolderPaths(data.folders);
        }
        setCollapsedFolders(allFolderPaths);

        setLoading(false);

        // Check for file parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        if (fileParam) {
          // Load the file from URL parameter
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
        }
      })
      .catch(err => {
        console.error('Error loading docs:', err);
        setLoading(false);
      });

    // Handle browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search);
      const fileParam = urlParams.get('file');
      if (fileParam) {
        loadFile(fileParam);
      } else {
        setSelectedFile(null);
        setContent('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Load file content
  const loadFile = async (filePath: string, hash?: string) => {
    rememberSidebarScroll();
    pendingHash.current = hash || null;
    setLoading(true);
    setSelectedFile(filePath);

    try {
      const res = await fetch(`/api/docs?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setContent(data.content || '');

      // Update URL without page reload
      const hashSuffix = pendingHash.current ? `#${pendingHash.current}` : '';
      const newUrl = `/docs?file=${encodeURIComponent(filePath)}${hashSuffix}`;
      window.history.pushState({ filePath }, '', newUrl);
    } catch (err) {
      console.error('Error loading file:', err);
      setContent('# Error\n\nFailed to load documentation file.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        restoreSidebarScroll();
        if (pendingHash.current) {
          scrollToHash(pendingHash.current);
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
    // Enable transitions after a brief delay to prevent initial animation
    setTimeout(() => setHasInteracted(true), 50);
  }, []);

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
            paddingLeft: `${0.5 + level * 1}rem`,
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
        paddingLeft: `${0.5 + level * 1}rem`,
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
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
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
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : '0',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid rgba(59, 130, 246, 0.3)',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: (isDragging || !hasInteracted) ? 'none' : 'width 0.3s ease-in-out',
          position: 'fixed',
          top: 0,
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
            {/* ...existing sidebar content... */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Image
                  src="/images/logo-horizontal.png"
                  alt={PRODUCT_NAME}
                  width={150}
                  height={50}
                  priority
                  style={{
                    height: 'auto',
                    filter: 'drop-shadow(0 4px 12px rgba(249, 115, 22, 0.3))'
                  }}
                />
              </div>
              <p style={{
                color: 'var(--blue-300)',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                Project Documentation
              </p>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'var(--blue-100)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--orange-500)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
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
                    No results found for "{searchQuery}"
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

            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
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
      <div style={{
        flex: 1,
        position: 'relative',
        marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0',
        transition: (isDragging || !hasInteracted) ? 'none' : 'margin-left 0.3s ease-in-out',
        willChange: 'margin-left',
      }}>
        {/* Fixed Toggle Button */}
        <button
          onClick={() => {
            setIsTogglingsidebar(true);
            setSidebarOpen(!sidebarOpen);
            setTimeout(() => setIsTogglingsidebar(false), 300);
          }}
          style={{
            position: 'fixed',
            top: '0.5rem',
            left: sidebarOpen ? `${sidebarWidth + 8}px` : '8px',
            zIndex: 1001,
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1.25rem',
            fontWeight: '600',
            transition: hasInteracted ? 'left 0.3s ease-in-out, background 0.2s' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.5rem',
            height: '2.5rem',
            lineHeight: '1',
            willChange: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
          }}
          title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

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
          ) : selectedFile ? (
            <div className="markdown-content">
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
                    return <p {...props}>{children}</p>;
                  },
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

                    return (
                      <pre
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          overflow: 'auto',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        {children}
                      </pre>
                    );
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
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem'
            }}>
              <h1 style={{
                color: 'var(--blue-100)',
                fontSize: '2.5rem',
                marginBottom: '1rem'
              }}>
                Welcome to {PRODUCT_NAME} Documentation
              </h1>
              <p style={{
                color: 'var(--blue-300)',
                fontSize: '1.125rem',
                marginBottom: '2rem'
              }}>
                Select a document from the sidebar to get started
              </p>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'left'
              }}>
                <h3 style={{
                  color: 'var(--blue-100)',
                  marginBottom: '1rem'
                }}>
                  📖 Quick Links
                </h3>
                <ul style={{
                  color: 'var(--blue-300)',
                  lineHeight: '2'
                }}>
                  <li>Getting Started guides</li>
                  <li>API documentation</li>
                  <li>Architecture overviews</li>
                  <li>Development guides</li>
                  <li>Feature implementations</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

