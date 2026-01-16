import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  debounceMs?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  debounceMs = 150,
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(isLoading);

  // isLoadingの最新値を常に参照できるようにする
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isLoadingRef.current || !hasMore) return;

    // デバウンス
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        if (!isLoadingRef.current && hasMore) {
          onLoadMore();
        }
      }
    }, debounceMs);
  }, [onLoadMore, hasMore, threshold, debounceMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleScroll]);

  return { containerRef };
}
