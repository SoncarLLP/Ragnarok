"use client";

import { useState, useRef, useCallback } from "react";

type Platform = {
  key: string;
  label: string;
  icon: string;
  getUrl?: (url: string, text: string) => string;
  action?: "copy";
};

const ALL_PLATFORMS: Platform[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "📘",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    icon: "🐦",
    getUrl: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "instagram",
    label: "Instagram (copy link)",
    icon: "📸",
    action: "copy",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    getUrl: (url, text) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: "copy",
    label: "Copy link",
    icon: "🔗",
    action: "copy",
  },
];

/** Platforms visible to admins (copy link only) */
const ADMIN_PLATFORMS: Platform[] = [ALL_PLATFORMS[5]]; // copy link

export default function ShareButton({
  postId,
  postContent,
  userRole,
}: {
  postId: string;
  postContent: string | null;
  userRole?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{
    bottom: number;
    left: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function computePos() {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      bottom: window.innerHeight - rect.top + 6,
      left: Math.min(rect.left, Math.max(0, window.innerWidth - 230)),
    };
  }

  function handleTriggerClick() {
    if (open) {
      setOpen(false);
    } else {
      const pos = computePos();
      if (pos) {
        setPopoverPos(pos);
        setOpen(true);
      }
    }
  }

  const startClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  function handleCopy() {
    const url = `${window.location.origin}/community/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setOpen(false);
  }

  function handlePlatform(p: Platform) {
    const url = `${window.location.origin}/community/${postId}`;
    const text =
      (postContent ?? "").slice(0, 100).trim() || "Check this out on SONCAR";

    if (p.action === "copy") {
      handleCopy();
      return;
    }
    if (p.getUrl) {
      window.open(p.getUrl(url, text), "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  }

  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const platforms = isSuperAdmin ? ALL_PLATFORMS : isAdmin ? ADMIN_PLATFORMS : [];

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onMouseLeave={startClose}
        onMouseEnter={cancelClose}
        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition select-none"
        aria-label="Share this post"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684 6.632 3.316m-6.632-6 6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684z"
          />
        </svg>
        {copied ? "Copied!" : "Share"}
      </button>

      {open && popoverPos && (
        <div
          style={{
            position: "fixed",
            bottom: popoverPos.bottom,
            left: popoverPos.left,
            zIndex: 9999,
            minWidth: 200,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={startClose}
          className="bg-neutral-800 border border-white/15 rounded-xl shadow-2xl overflow-hidden py-1"
        >
          {/* No share access — coming soon */}
          {!isAdmin && (
            <div className="px-4 py-3 text-xs text-neutral-400 text-center">
              Social sharing coming soon
            </div>
          )}

          {/* Admin / super admin options */}
          {isAdmin &&
            platforms.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePlatform(p)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-white/8 transition text-neutral-200"
              >
                <span className="text-base leading-none">{p.icon}</span>
                {p.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
