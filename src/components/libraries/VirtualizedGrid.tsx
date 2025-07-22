"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  threshold?: number;
  initialBatchSize?: number;
  batchSize?: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  className = "",
  itemClassName = "",
  threshold = 0.1,
  initialBatchSize = 12,
  batchSize = 8,
}: VirtualizedGridProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialBatchSize);
  const { ref, inView } = useInView({
    threshold,
    triggerOnce: false,
  });

  // Load more items when the last batch comes into view
  useEffect(() => {
    if (inView && visibleCount < items.length) {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
    }
  }, [inView, visibleCount, items.length, batchSize]);

  // Reset visible count when items change
  useEffect(() => {
    setVisibleCount(initialBatchSize);
  }, [items, initialBatchSize]);

  return (
    <div className={className}>
      {items.slice(0, visibleCount).map((item, index) => (
        <div key={index} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
      {visibleCount < items.length && (
        <div ref={ref} className="h-20 w-full" /> // Loading trigger element
      )}
    </div>
  );
}
