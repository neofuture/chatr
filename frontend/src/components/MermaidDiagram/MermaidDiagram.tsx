'use client';

import { useEffect, useRef, useState } from 'react';

// This component is loaded with next/dynamic { ssr: false } so mermaid
// is never bundled for the server and won't cause build errors.

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const initialized = useRef(false);

  useEffect(() => {
    const render = async () => {
      const { default: mermaid } = await import(/* webpackIgnore: true */ 'mermaid' as string);

      if (!initialized.current) {
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
        initialized.current = true;
      }

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setSvg(`<pre style="color:#ef4444;">Error rendering diagram: ${err}</pre>`);
      }
    };

    if (chart) render();
  }, [chart]);

  return (
    <div
      ref={containerRef}
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
}

