'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './FlipText.module.css';

interface Props {
  value: string;
  style?: React.CSSProperties;
}

export default function FlipText({ value, style }: Props) {
  const [displayed, setDisplayed] = useState(value);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const nextRef = useRef(value);

  useEffect(() => {
    if (value === displayed && phase === 'idle') return;
    nextRef.current = value;
    setPhase('out');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleAnimationEnd = () => {
    if (phase === 'out') {
      setDisplayed(nextRef.current);
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
      {displayed}
    </div>
  );
}

