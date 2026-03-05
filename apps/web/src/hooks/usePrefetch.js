import { useCallback } from 'react';

/**
 * usePrefetch Hook
 * Prefetches product/notification data and stores in session cache
 * Enables instant page navigation with no lag
 */

const CACHE_KEY_PREFIX = 'prefetch_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for prefetched data
const memoryCache = new Map();

export const usePrefetch = () => {
  // Prefetch by slug
  const prefetchBySlug = useCallback(async (type, slug) => {
    if (!slug) return null;

    const cacheKey = `${type}:${slug}`;
    
    // Check memory cache first
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/${type}/slug/${slug}`);
      if (!response.ok) return null;
      
      const result = await response.json();
      if (result.success && result.data) {
        // Store in memory cache
        memoryCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
        });
        return result.data;
      }
    } catch (error) {
      console.error(`Prefetch error for ${type}/${slug}:`, error);
    }
    
    return null;
  }, []);

  // Prefetch list (all products/notifications)
  const prefetchList = useCallback(async (type) => {
    const cacheKey = `${type}:list`;
    
    // Check memory cache first
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/${type}`);
      if (!response.ok) return null;
      
      const result = await response.json();
      if (result.success && result.data) {
        // Store in memory cache
        memoryCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
        });
        return result.data;
      }
    } catch (error) {
      console.error(`Prefetch list error for ${type}:`, error);
    }
    
    return null;
  }, []);

  // Prefetch by tag
  const prefetchByTag = useCallback(async (type, tag) => {
    if (!tag) return null;

    const cacheKey = `${type}:tag:${tag}`;
    
    // Check memory cache first
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/${type}/tag/${tag}`);
      if (!response.ok) return null;
      
      const result = await response.json();
      if (result.success && result.data) {
        // Store in memory cache
        memoryCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
        });
        return result.data;
      }
    } catch (error) {
      console.error(`Prefetch tag error for ${type}/${tag}:`, error);
    }
    
    return null;
  }, []);

  // Clear specific cache
  const clearCache = useCallback((type, identifier = null) => {
    if (!identifier) {
      // Clear all for this type
      for (const key of memoryCache.keys()) {
        if (key.startsWith(type)) {
          memoryCache.delete(key);
        }
      }
    } else {
      memoryCache.delete(`${type}:${identifier}`);
    }
  }, []);

  // Get cached data without fetching
  const getCached = useCallback((type, identifier = null) => {
    if (!identifier) {
      const cacheKey = `${type}:list`;
      const cached = memoryCache.get(cacheKey);
      return cached ? cached.data : null;
    }
    
    const cacheKey = `${type}:${identifier}`;
    const cached = memoryCache.get(cacheKey);
    return cached ? cached.data : null;
  }, []);

  return {
    prefetchBySlug,
    prefetchList,
    prefetchByTag,
    clearCache,
    getCached,
  };
};

export default usePrefetch;
