"use client";

import { useEffect, useState, useCallback } from "react";
import { countPendingItems } from "@/lib/offline/db";
import { syncAllPending } from "@/lib/offline/sync";

interface Props {
  userId: string;
}

export default function SyncStatusBar({ userId }: Props) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await countPendingItems(userId);
      setPendingCount(count);
    } catch {
      // IndexedDB not available (SSR guard)
    }
  }, [userId]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      const count = await countPendingItems(userId);
      if (count > 0) {
        setSyncing(true);
        await syncAllPending(userId);
        setSyncing(false);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
        refreshCount();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh count every 30s
    const interval = setInterval(refreshCount, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [userId, refreshCount]);

  // Don't render if everything is fine (online + no pending)
  if (isOnline && pendingCount === 0 && !syncing && !justSynced) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-xs font-medium text-center transition-all"
      style={{
        background: syncing
          ? "rgba(251,191,36,0.15)"
          : justSynced
          ? "rgba(52,211,153,0.15)"
          : !isOnline
          ? "rgba(248,113,113,0.15)"
          : "rgba(251,191,36,0.1)",
        borderBottom: `1px solid ${
          syncing
            ? "rgba(251,191,36,0.3)"
            : justSynced
            ? "rgba(52,211,153,0.3)"
            : !isOnline
            ? "rgba(248,113,113,0.3)"
            : "rgba(251,191,36,0.2)"
        }`,
        backdropFilter: "blur(8px)",
      }}
    >
      {syncing && (
        <span style={{ color: "#fbbf24" }}>
          ↑ Syncing offline data...
        </span>
      )}
      {!syncing && justSynced && (
        <span style={{ color: "#34d399" }}>
          ✓ All data synced
        </span>
      )}
      {!syncing && !justSynced && !isOnline && (
        <span style={{ color: "#f87171" }}>
          ⚡ Offline mode · {pendingCount > 0 ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} pending sync` : "data will sync when reconnected"}
        </span>
      )}
      {!syncing && !justSynced && isOnline && pendingCount > 0 && (
        <span style={{ color: "#fbbf24" }}>
          ⏳ {pendingCount} item{pendingCount === 1 ? "" : "s"} pending sync
        </span>
      )}
    </div>
  );
}
