"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "follow" | "unfollow" | "request" | "requested";

export default function FollowButton({
  targetUserId,
  initialFollowing,
  currentUserId,
  compact = false,
  targetAccountMode = "public",
  initialRequestPending = false,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  currentUserId: string | null;
  compact?: boolean;
  targetAccountMode?: string | null;
  initialRequestPending?: boolean;
}) {
  function deriveMode(): Mode {
    if (initialFollowing) return "unfollow";
    if (targetAccountMode === "followers_only") {
      return initialRequestPending ? "requested" : "request";
    }
    return "follow";
  }

  const [mode, setMode] = useState<Mode>(deriveMode);

  async function toggle() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    const supabase = createClient();

    if (mode === "unfollow") {
      setMode(targetAccountMode === "followers_only" ? "request" : "follow");
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      return;
    }

    if (mode === "follow") {
      setMode("unfollow");
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: targetUserId });
      return;
    }

    if (mode === "request") {
      setMode("requested");
      await fetch("/api/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", target_id: targetUserId }),
      });
      return;
    }

    if (mode === "requested") {
      setMode("request");
      await fetch("/api/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", target_id: targetUserId }),
      });
      return;
    }
  }

  const labels: Record<Mode, string> = {
    follow: "Follow",
    unfollow: "Following",
    request: "Request to Follow",
    requested: "Requested",
  };
  const hoverLabels: Record<Mode, string> = {
    follow: "Follow",
    unfollow: "Unfollow",
    request: "Request to Follow",
    requested: "Cancel Request",
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition ${
          mode === "unfollow"
            ? "border-white/20 text-neutral-400 hover:border-rose-500/40 hover:text-rose-400"
            : mode === "requested"
            ? "border-violet-400/30 text-violet-400 hover:border-rose-500/40 hover:text-rose-400"
            : "border-amber-400/40 text-amber-400 hover:border-amber-400"
        }`}
      >
        {labels[mode]}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`group px-5 py-2 rounded-lg text-sm font-medium transition ${
        mode === "unfollow"
          ? "bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-300"
          : mode === "requested"
          ? "bg-violet-500/15 hover:bg-rose-500/20 hover:text-rose-400 text-violet-300"
          : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
      }`}
    >
      <span className="group-hover:hidden">{labels[mode]}</span>
      <span className="hidden group-hover:inline">{hoverLabels[mode]}</span>
    </button>
  );
}
