'use client';

import { useEffect } from 'react';
import { usePrefetch } from '@/hooks/usePrefetch';
import FloatingSupport from '@/components/FloatingSupport';

/**
 * PrefetchProvider Component
 * Initializes prefetch cache with common data on app load
 * Ensures instant navigation throughout the app
 */

export function PrefetchProvider({ children }) {
  const { prefetchList, prefetchByTag } = usePrefetch();

  useEffect(() => {
    // Prefetch lists on app load (non-blocking)
    const initPrefetch = async () => {
      try {
        // Prefetch featured products and notifications in parallel
        await Promise.all([
          prefetchList('products'),
          prefetchList('notifications'),
        ]).catch(err => console.log('Prefetch init:', err));
      } catch (error) {
        console.error('Prefetch initialization error:', error);
      }
    };

    initPrefetch();
  }, [prefetchList]);

  return (
    <>
      {children}
      <FloatingSupport />
    </>
  );
}

export default PrefetchProvider;
