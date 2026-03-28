"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({
  targetUserId,
  initialFollowing,
  currentUserId,
  compact = false,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  currentUserId: string | null;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);

  async function toggle() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    const next = !following;
    setFollowing(next);

    const supabase = createClient();
    if (next) {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: targetUserId });
    } else {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition ${
          following
            ? "border-white/20 text-neutral-400 hover:border-rose-500/40 hover:text-rose-400"
            : "border-amber-400/40 text-amber-400 hover:border-amber-400"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
        following
          ? "bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-300"
          : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
