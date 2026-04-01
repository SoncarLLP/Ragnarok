"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EMOJIS = ["👍", "❤️", "💪", "🔥", "😮", "😂", "😢"] as const;
type Emoji = (typeof EMOJIS)[number];

const EMOJI_LABELS: Record<Emoji, string> = {
  "👍": "Like",
  "❤️": "Love",
  "💪": "Strength",
  "🔥": "Fire",
  "😮": "Wow",
  "😂": "Haha",
  "😢": "Sad",
};

/** SVG smiley face — universally supported, used when user hasn't reacted */
function SmileyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    >
      <circle cx={10} cy={10} r={8} strokeLinecap="round" />
      <path strokeLinecap="round" d="M7 12.5s.8 1.5 3 1.5 3-1.5 3-1.5" />
      <circle cx={7.5} cy={8.5} r={0.75} fill="currentColor" stroke="none" />
      <circle cx={12.5} cy={8.5} r={0.75} fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ReactionButton({
  postId,
  commentId,
  initialCount,
  initialReaction,
  topReactions = [],
  currentUserId,
}: {
  postId?: string;
  commentId?: string;
  initialCount: number;
  initialReaction: string | null;
  topReactions?: string[];
  currentUserId: string | null;
}) {
  const [reaction, setReaction] = useState(initialReaction);
  const [count, setCount] = useState(initialCount);
  const [showPicker, setShowPicker] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ bottom: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Compute position of picker above the trigger button using fixed coords. */
  function computePickerPos() {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      bottom: window.innerHeight - rect.top + 8,
      // Keep picker within viewport horizontally (it's ~290px wide)
      left: Math.min(rect.left, Math.max(0, window.innerWidth - 296)),
    };
  }

  const openPicker = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const pos = computePickerPos();
    if (pos) {
      setPickerPos(pos);
      setShowPicker(true);
    }
  }, []);

  const startClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setShowPicker(false), 220);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  function handleTriggerClick() {
    if (showPicker) {
      setShowPicker(false);
    } else {
      openPicker();
    }
  }

  async function handleEmojiClick(emoji: Emoji) {
    setShowPicker(false);

    if (!currentUserId) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3500);
      return;
    }

    const supabase = createClient();

    if (reaction === emoji) {
      // Toggle off — remove reaction
      setReaction(null);
      setCount((c) => Math.max(0, c - 1));
      let q = supabase.from("reactions").delete().eq("user_id", currentUserId);
      if (postId) q = q.eq("post_id", postId);
      else q = q.eq("comment_id", commentId!);
      await q;
    } else {
      // Add or replace reaction
      const wasReacting = !!reaction;
      setReaction(emoji);
      if (!wasReacting) setCount((c) => c + 1);

      // Delete any prior reaction for this user, then insert the new one
      let delQ = supabase.from("reactions").delete().eq("user_id", currentUserId);
      if (postId) delQ = delQ.eq("post_id", postId);
      else delQ = delQ.eq("comment_id", commentId!);
      await delQ;

      const target = postId ? { post_id: postId } : { comment_id: commentId };
      await supabase.from("reactions").insert({ ...target, user_id: currentUserId, emoji });
    }
  }

  const isReacted = !!reaction;

  return (
    <div className="relative inline-flex items-center">
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        onMouseEnter={openPicker}
        onMouseLeave={startClose}
        aria-label={isReacted ? `Your reaction: ${reaction} — click to change` : "React to this"}
        className={`flex items-center gap-1 text-xs transition-colors select-none ${
          isReacted ? "text-amber-400" : "text-neutral-400 hover:text-white"
        }`}
      >
        {isReacted ? (
          <span className="text-base leading-none">{reaction}</span>
        ) : (
          <SmileyIcon className="w-4 h-4 shrink-0" />
        )}
        {/* Always show "React" when count is 0 so the button is discoverable */}
        <span>{count > 0 ? count : "React"}</span>
        {/* Top 3 emojis breakdown */}
        {topReactions.length > 0 && count > 0 && (
          <span className="text-neutral-500 text-[11px] leading-none" aria-hidden="true">
            {topReactions.slice(0, 3).join("")}
          </span>
        )}
      </button>

      {/* ── Reaction picker ──────────────────────────────────────────────
           Uses position:fixed so it escapes any overflow:hidden parent
           (e.g. the article element in PostCard).
      ─────────────────────────────────────────────────────────────────── */}
      {showPicker && pickerPos && (
        <div
          style={{
            position: "fixed",
            bottom: pickerPos.bottom,
            left: pickerPos.left,
            zIndex: 9999,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={startClose}
          role="dialog"
          aria-label="Choose a reaction"
          className="flex items-end gap-0.5 rounded-2xl shadow-2xl px-1.5 py-1.5"
          style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => handleEmojiClick(e)}
              onMouseEnter={() => setHoveredEmoji(e)}
              onMouseLeave={() => setHoveredEmoji(null)}
              aria-label={EMOJI_LABELS[e]}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl text-xl
                transition-all duration-150 hover:scale-125 hover:bg-white/10
                ${reaction === e ? "bg-amber-500/20 scale-110" : ""}`}
            >
              {e}
              {hoveredEmoji === e && (
                <span
                  className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none"
                  style={{ zIndex: 10000, background: "var(--nrs-panel)", border: "1px solid var(--nrs-border-subtle)", color: "var(--nrs-text-body)" }}
                >
                  {EMOJI_LABELS[e]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Sign-in prompt (for guests who click an emoji) ── */}
      {showLoginPrompt && (
        <div className="absolute bottom-full left-0 mb-2 w-52 p-2.5 rounded-lg text-xs text-center shadow-xl z-50" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text-body)" }}>
          <Link href="/auth/login" className="text-amber-400 hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/auth/signup" className="text-amber-400 hover:underline">
            sign up
          </Link>{" "}
          to react
        </div>
      )}
    </div>
  );
}
