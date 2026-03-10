'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './MermaidDiagram.module.css';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

interface Props {
  chart: string;
}

let mermaidPromise: Promise<any> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import(/* webpackIgnore: true */ CDN_URL).then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
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
      return mermaid;
    });
  }
  return mermaidPromise;
}

export default function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!chart) return;

    let cancelled = false;

    loadMermaid()
      .then(async (mermaid) => {
        if (cancelled) return;
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      })
      .catch((err) => {
        console.error('Mermaid render error:', err);
        if (!cancelled)
          setSvg(`<pre style="color:#ef4444;">Error rendering diagram: ${err}</pre>`);
      });

    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram ${styles.diagram}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

