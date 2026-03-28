"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LikeButton({
  postId,
  initialCount,
  initialLiked,
  currentUserId,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  currentUserId: string | null;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [showPrompt, setShowPrompt] = useState(false);

  async function toggle() {
    if (!currentUserId) {
      setShowPrompt(true);
      setTimeout(() => setShowPrompt(false), 3500);
      return;
    }

    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    const supabase = createClient();
    if (next) {
      await supabase.from("likes").insert({ post_id: postId, user_id: currentUserId });
    } else {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 text-xs transition ${
          liked ? "text-rose-400" : "text-neutral-400 hover:text-white"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
          />
        </svg>
        {count}
      </button>

      {showPrompt && (
        <div className="absolute bottom-full left-0 mb-2 w-52 p-2.5 rounded-lg bg-neutral-800 border border-white/10 text-xs text-center shadow-xl z-20">
          <Link href="/auth/login" className="text-amber-400 hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/auth/signup" className="text-amber-400 hover:underline">
            sign up
          </Link>{" "}
          to like posts
        </div>
      )}
    </div>
  );
}
