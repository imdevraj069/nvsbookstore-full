import Link from 'next/link';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useCallback } from 'react';

/**
 * PrefetchLink Component
 * Link component that prefetches data on hover
 * Enables smooth navigation with zero lag
 * 
 * Usage:
 * <PrefetchLink href="/store/product-slug" dataType="products" dataId="product-slug">
 *   Click me
 * </PrefetchLink>
 */

export const PrefetchLink = ({
  href,
  dataType = null,
  dataId = null,
  children,
  onPrefetch = null,
  ...props
}) => {
  const { prefetchBySlug } = usePrefetch();

  const handleMouseEnter = useCallback(async () => {
    // Prefetch data when user hovers over link (before they click)
    if (dataType && dataId) {
      const data = await prefetchBySlug(dataType, dataId);
      if (onPrefetch) {
        onPrefetch(data);
      }
    }
  }, [dataType, dataId, prefetchBySlug, onPrefetch]);

  return (
    <Link href={href} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
};

export default PrefetchLink;
