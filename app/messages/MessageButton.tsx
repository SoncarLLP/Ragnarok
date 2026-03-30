"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageButton({
  targetUserId,
  messagingDisabled,
  viewerRole,
}: {
  targetUserId: string;
  messagingDisabled: boolean;
  viewerRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Super admins bypass the messaging_disabled restriction
  const isBlocked = messagingDisabled && viewerRole !== "super_admin";

  if (isBlocked) {
    return (
      <span className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-neutral-500 cursor-not-allowed select-none">
        Messaging Disabled
      </span>
    );
  }

  async function handleClick() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "direct", participant_ids: [targetUserId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open conversation");
      router.push(`/messages?conversation=${data.conversation_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-60 transition"
      >
        {loading ? "Opening…" : "Message"}
      </button>
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  );
}
