import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';

/**
 * Find the closest scrollable ancestor element so IntersectionObserver works
 * reliably both inside `overflow-y-auto` containers and on window scroll.
 */
function findScrollableAncestor(node) {
  if (!node || typeof window === 'undefined') return null;
  let current = node.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style ? style.overflowY : '';
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Progressive scroll-loading hook for optimizing initial render & DOM node count
 * across large lists, tables, and card grids.
 */
export function useInfiniteScroll(items = [], { initialCount = 8, step = 8 } = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleItems = useMemo(
    () => safeItems.slice(0, visibleCount),
    [safeItems, visibleCount]
  );

  const hasMore = visibleCount < safeItems.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev >= safeItems.length) return prev;
      return Math.min(safeItems.length, prev + step);
    });
  }, [safeItems.length, step]);

  const resetCount = useCallback(() => {
    setVisibleCount(initialCount);
  }, [initialCount]);

  const handleContainerScroll = useCallback(
    (e) => {
      if (!hasMore) return;
      const target = e.currentTarget;
      if (!target) return;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining <= 160) {
        loadMore();
      }
    },
    [hasMore, loadMore]
  );

  return {
    visibleItems,
    hasMore,
    loadMore,
    resetCount,
    handleContainerScroll,
    visibleCount: Math.min(visibleCount, safeItems.length),
    totalCount: safeItems.length,
    initialCount,
    step,
  };
}

/**
 * IntersectionObserver sentinel + status indicator that automatically loads
 * the next batch of items when the user scrolls near the bottom of the list.
 */
export default function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  shownCount = 0,
  totalCount = 0,
  initialCount = 6,
  itemLabel = 'items',
  className = '',
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === 'undefined') return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const scrollRoot = findScrollableAncestor(node);
    let timerId = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          timerId = window.setTimeout(() => {
            onLoadMore();
          }, 80);
        }
      },
      {
        root: scrollRoot || null,
        rootMargin: scrollRoot ? '140px 0px' : '220px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => {
      if (timerId) window.clearTimeout(timerId);
      observer.disconnect();
    };
  }, [hasMore, onLoadMore, shownCount, totalCount]);

  if (!hasMore) {
    if (totalCount > initialCount && totalCount > 6) {
      return (
        <div
          className={`py-2.5 px-4 flex items-center justify-between gap-2 text-[11px] text-[#7A6A5C] bg-[#FFF9F2]/50 border-t border-[#F0E4D7]/70 rounded-b-2xl ${className}`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Showing all <strong className="text-[#2B2118] font-mono">{totalCount}</strong> {itemLabel}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#9E8E81] uppercase tracking-wider">
            Scroll-Load Active
          </span>
        </div>
      );
    }
    return null;
  }

  const remainingCount = Math.max(0, totalCount - shownCount);

  return (
    <div
      ref={sentinelRef}
      className={`py-3 px-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A6A5C] bg-[#FFF9F2]/80 border-t border-[#F0E4D7]/80 rounded-b-2xl ${className}`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <Loader2 className="w-3.5 h-3.5 text-[#F26B1D] animate-spin shrink-0" />
        <span>
          Showing <strong className="text-[#2B2118] font-mono">{shownCount}</strong> of{' '}
          <strong className="text-[#2B2118] font-mono">{totalCount}</strong> {itemLabel} • Scroll down to load more
        </span>
      </div>
      <button
        type="button"
        onClick={onLoadMore}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] font-extrabold text-[11px] transition cursor-pointer shadow-2xs"
      >
        <span>Load More ({remainingCount} left)</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
