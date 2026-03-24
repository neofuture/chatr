'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './MermaidDiagram.module.css';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

interface Props {
  chart: string;
}

let mermaidMod: any = null;
let mermaidPromise: Promise<any> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import(/* webpackIgnore: true */ CDN_URL).then((mod) => {
      mermaidMod = mod.default;
      return mermaidMod;
    });
  }
  return mermaidPromise;
}

function initMermaid(mermaid: any) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e3a5f',
      primaryTextColor: '#e0f2fe',
      primaryBorderColor: '#3b82f6',
      lineColor: '#3b82f6',
      secondaryColor: '#1e3a5f',
      tertiaryColor: '#1e3a5f',
      background: '#0f172a',
      mainBkg: '#1e3a5f',
      secondBkg: '#334155',
      textColor: '#e0f2fe',
      border1: '#3b82f6',
      border2: '#3b82f6',
      arrowheadColor: '#3b82f6',
      noteBkgColor: '#f97316',
      noteTextColor: '#000000',
      noteBorderColor: '#c2410c',
      edgeLabelBackground: 'transparent',
      actorBkg: '#1e3a5f',
      actorBorder: '#3b82f6',
      actorTextColor: '#e0f2fe',
      actorLineColor: '#3b82f6',
      signalColor: '#e0f2fe',
      signalTextColor: '#e0f2fe',
      activationBkgColor: '#334155',
      activationBorderColor: '#3b82f6',
    },
    flowchart: { curve: 'basis', padding: 15, nodeSpacing: 50, rankSpacing: 50 },
    securityLevel: 'loose',
  });
}

function isOrangeFill(rect: SVGRectElement): boolean {
  const attr = rect.getAttribute('fill') || '';
  if (attr.includes('f97316') || attr === 'rgb(249, 115, 22)') return true;
  try {
    const computed = window.getComputedStyle(rect).fill;
    if (computed.includes('249') && computed.includes('115')) return true;
  } catch { /* ignore */ }
  return false;
}

function postStyleDom(el: HTMLElement) {
  // Match note rects by class (most reliable)
  el.querySelectorAll<SVGRectElement>('.note rect').forEach((rect) => {
    rect.setAttribute('rx', '6');
    rect.setAttribute('ry', '6');
    const h = rect.getAttribute('height');
    if (h) rect.setAttribute('height', String(parseFloat(h) - 10));
  });

  // Also match by fill color as fallback
  el.querySelectorAll<SVGRectElement>('rect').forEach((rect) => {
    if (isOrangeFill(rect)) {
      rect.setAttribute('rx', '6');
      rect.setAttribute('ry', '6');
      const h = rect.getAttribute('height');
      if (h && parseFloat(h) > 30) rect.setAttribute('height', String(parseFloat(h) - 10));
    }
  });

  // Blue node/actor rects: subtle rounding
  el.querySelectorAll<SVGRectElement>('.node rect, .actor, .statediagram-state rect').forEach((rect) => {
    rect.setAttribute('rx', '4');
    rect.setAttribute('ry', '4');
  });
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
        initMermaid(mermaid);
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

  useEffect(() => {
    if (!svg || !containerRef.current) return;
    requestAnimationFrame(() => {
      if (containerRef.current) postStyleDom(containerRef.current);
    });
  }, [svg]);

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram ${styles.diagram}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
