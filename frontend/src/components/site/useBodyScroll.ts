'use client';

import { useEffect } from 'react';

/**
 * Enables normal document scrolling on marketing pages.
 *
 * The app sets `overscroll-behavior-y: contain` on body to prevent
 * pull-to-refresh on mobile. Combined with `overflow-x: hidden`
 * (which implicitly creates an overflow-y scroll context on body),
 * this blocks wheel/trackpad scroll-chaining from body to the
 * viewport — even though body has no scrollable overflow itself.
 *
 * Fix: override overscroll-behavior so the viewport receives wheel events.
 */
export function useBodyScroll() {
  useEffect(() => {
    const body = document.body;
    body.style.setProperty('overscroll-behavior-y', 'auto', 'important');

    return () => {
      body.style.removeProperty('overscroll-behavior-y');
    };
  }, []);
}
