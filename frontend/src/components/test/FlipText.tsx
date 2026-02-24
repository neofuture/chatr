'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import styles from './FlipText.module.css';

interface Props {
  value: string;
  style?: React.CSSProperties;
  /** Optional: render custom JSX instead of the plain string value */
  renderValue?: () => ReactNode;
}

export default function FlipText({ value, style, renderValue }: Props) {
  const [displayed, setDisplayed] = useState(value);
  // Wrap in object so useState never treats the fn as a lazy initialiser
  const [displayedRender, setDisplayedRender] = useState<{ fn: (() => ReactNode) | undefined }>({ fn: renderValue });
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const nextRef = useRef(value);
  const nextRenderRef = useRef(renderValue);

  useEffect(() => {
    if (value === displayed && phase === 'idle') return;
    nextRef.current = value;
    nextRenderRef.current = renderValue;
    setPhase('out');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleAnimationEnd = () => {
    if (phase === 'out') {
      setDisplayed(nextRef.current);
      setDisplayedRender({ fn: nextRenderRef.current });
      setPhase('in');
    } else if (phase === 'in') {
      setPhase('idle');
    }
  };

  const cls = [
    styles.text,
    phase === 'out' ? styles.out : phase === 'in' ? styles.in : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onAnimationEnd={handleAnimationEnd}
      style={style}
    >
      {displayedRender.fn ? displayedRender.fn() : displayed}
    </div>
  );
}

