"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowRequestActions({
  requestId,
  requesterId,
}: {
  requestId: string;
  requesterId: string;
}) {
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [done, setDone] = useState<"approved" | "declined" | null>(null);
  const router = useRouter();

  async function act(action: "approve" | "decline") {
    setState("loading");
    await fetch("/api/follow-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, requester_id: requesterId, action }),
    });
    setDone(action === "approve" ? "approved" : "declined");
    router.refresh();
  }

  if (done === "approved") {
    return <span className="text-xs text-emerald-400 px-2">Approved</span>;
  }
  if (done === "declined") {
    return <span className="text-xs text-neutral-500 px-2">Declined</span>;
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => act("approve")}
        disabled={state === "loading"}
        className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => act("decline")}
        disabled={state === "loading"}
        className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
