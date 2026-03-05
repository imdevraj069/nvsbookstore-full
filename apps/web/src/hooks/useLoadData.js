import { useState, useEffect, useCallback } from 'react';
import { usePrefetch } from './usePrefetch';

/**
 * useLoadData Hook
 * Loads data from prefetch cache first (instant), then fetches fresh if needed
 * Provides smooth perceived loading with instant UI rendering
 */

export const useLoadData = (type, identifier, fetchFunction = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { getCached, prefetchBySlug } = usePrefetch();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Check if data is in prefetch cache (instant)
        const cachedData = getCached(type, identifier);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          // Step 2: Fetch fresh data in background to keep cache updated
          // (but don't show loading state)
          if (fetchFunction) {
            try {
              const freshData = await fetchFunction(identifier);
              if (freshData && JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
                setData(freshData);
              }
            } catch (err) {
              console.error('Background refresh error:', err);
            }
          }
          return;
        }

        // Step 2: If not in cache, fetch from API
        if (fetchFunction) {
          const freshData = await fetchFunction(identifier);
          setData(freshData);
        } else {
          // Fallback: fetch by slug
          const freshData = await prefetchBySlug(type, identifier);
          setData(freshData);
        }

        setLoading(false);
      } catch (err) {
        console.error(`Error loading ${type}/${identifier}:`, err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, [type, identifier, fetchFunction, getCached, prefetchBySlug]);

  return { data, loading, error };
};

export default useLoadData;
