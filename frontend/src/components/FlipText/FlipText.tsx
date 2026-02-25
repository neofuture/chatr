'use client';

import { useState, useEffect, useRef } from 'react';

interface FlipTextProps {
  value: string;
  style?: React.CSSProperties;
  className?: string;
  renderValue?: (v: string) => React.ReactNode;
}

const H = 16;

export default function FlipText({ value, style, className, renderValue }: FlipTextProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const row1Ref  = useRef<HTMLDivElement>(null);
  const row2Ref  = useRef<HTMLDivElement>(null);
  const currentRef = useRef(value);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef     = useRef<number | null>(null);

  // React state only drives renderValue content — plain text is set via textContent
  const [r1Val, setR1Val] = useState(value);
  const [r2Val, setR2Val] = useState(value);

  const setTrack = (y: number, animated: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none';
    el.style.transform  = `translateY(${y}px)`;
  };

  const setRowText = (el: HTMLDivElement | null, v: string) => {
    if (el && !renderValue) el.textContent = v;
  };

  // Initialise plain text on mount
  useEffect(() => {
    setRowText(row1Ref.current, value);
    setRowText(row2Ref.current, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value === currentRef.current) return;
    currentRef.current = value;

    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    // STEP 1: reset track to 0 (no anim), fill row2 with new value
    setTrack(0, false);
    setRowText(row2Ref.current, value);
    setR2Val(value); // for renderValue case — row2 is below viewport so invisible

    // STEP 2: two rAFs so row2 paints before we animate
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {

        // STEP 3: slide up — row2 scrolls into view
        setTrack(-H, true);

        timerRef.current = setTimeout(() => {
          // STEP 4: animation done, row2 is visible, row1 is ABOVE viewport
          // Hide row1 div entirely before touching its content
          if (row1Ref.current) row1Ref.current.style.opacity = '0';

          // Update row1 content while hidden (React re-render is fine — it's invisible)
          setR1Val(value);
          setRowText(row1Ref.current, value);

          // STEP 5: next rAF — row1 DOM is updated, now snap track to 0
          // row1 shows new text at position 0, identical to where row2 is
          rafRef.current = requestAnimationFrame(() => {
            setTrack(0, false); // instant snap — no transition
            if (row1Ref.current) row1Ref.current.style.opacity = '1'; // reveal row1

            // STEP 6: clear row2 content (it's now behind row1, invisible)
            rafRef.current = requestAnimationFrame(() => {
              setRowText(row2Ref.current, '');
              setR2Val(currentRef.current); // keep in sync
            });
          });
        }, 360);
      });
    });

    return () => {
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const slot: React.CSSProperties = {
    height: H,
    lineHeight: `${H}px`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexShrink: 0,
    display: 'block',
  };

  return (
    <div
      className={className}
      style={{ ...style, position: 'relative', height: H, overflow: 'hidden' }}
    >
      <div
        ref={trackRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: 'translateY(0)', transition: 'none' }}
      >
        <div ref={row1Ref} style={slot}>
          {renderValue ? renderValue(r1Val) : null}
        </div>
        <div ref={row2Ref} style={slot}>
          {renderValue ? renderValue(r2Val) : null}
        </div>
      </div>
    </div>
  );
}

