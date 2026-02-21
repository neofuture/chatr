'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * RoutePreloader - Preloads all critical app routes on mount
 * This ensures instant navigation with no loading delays
 */
export default function RoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    // Preload all app routes immediately
    const routes = [
      '/app',
      '/app/groups',
      '/app/updates',
      '/app/settings'
    ];

    // Prefetch each route to load their JavaScript chunks
    routes.forEach(route => {
      router.prefetch(route);
    });

    console.log('[RoutePreloader] Preloaded all app routes');
  }, [router]);

  return null; // This component renders nothing
}

