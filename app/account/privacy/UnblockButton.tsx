"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnblockButton({ blockedId }: { blockedId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUnblock() {
    setLoading(true);
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_id: blockedId }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleUnblock}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:text-white text-neutral-400 transition disabled:opacity-50"
    >
      {loading ? "Unblocking…" : "Unblock"}
    </button>
  );
}
