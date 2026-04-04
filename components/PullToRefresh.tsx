"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Pixels to pull before triggering refresh (default 80) */
  threshold?: number;
}

/**
 * Pull-to-refresh container. Wrap a scrollable list to enable pull-to-refresh on mobile.
 * Only activates when scrolled to the top of the page.
 */
export default function PullToRefresh({ onRefresh, children, threshold = 80 }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate pull-to-refresh when scrolled to the top
    if (window.scrollY > 5) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        // Scrolling down — cancel pull
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      // Resistance effect: slow down as it stretches
      setPullDistance(Math.min(delta * 0.5, threshold + 20));
    },
    [refreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      // Haptic feedback
      if ("vibrate" in navigator) navigator.vibrate(50);
      setRefreshing(true);
      setPullDistance(threshold / 2);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    startY.current = null;
  }, [pullDistance, threshold, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative" }}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: `translateX(-50%) translateY(${Math.max(pullDistance - 20, 0)}px)`,
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--nrs-card, rgba(255,255,255,0.05))",
            border: "1px solid var(--nrs-border, rgba(255,255,255,0.1))",
            zIndex: 10,
            transition: refreshing ? "none" : "transform 0.1s",
          }}
        >
          {refreshing ? (
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--nrs-accent, #c9a84c)"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={progress >= 1 ? "var(--nrs-accent, #c9a84c)" : "var(--nrs-text-muted, #6b7280)"}
              strokeWidth="2"
              style={{
                transform: `rotate(${progress * 180}deg)`,
                transition: "transform 0.1s, stroke 0.2s",
              }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>
      )}

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pulling.current ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
