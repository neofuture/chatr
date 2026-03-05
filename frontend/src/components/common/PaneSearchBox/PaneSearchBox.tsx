'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import styles from './PaneSearchBox.module.css';

export interface PaneSearchBoxHandle {
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Called when the clear button is clicked (after value is reset) */
  onClear?: () => void;
  autoFocus?: boolean;
}

const PaneSearchBox = forwardRef<PaneSearchBoxHandle, Props>(function PaneSearchBox({ value, onChange, placeholder = 'Search…', onClear, autoFocus }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <i className={`fas fa-search ${styles.icon}`} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={placeholder}
        />
        {value && (
          <button
            className={styles.clear}
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
});

export default PaneSearchBox;

