"use client";

import { useState } from "react";

export default function DeleteButton({
  type,
  id,
  onDeleted,
}: {
  type: "post" | "comment";
  id: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch("/api/admin/community/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    onDeleted();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-neutral-500 hover:text-white"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
    >
      Delete
    </button>
  );
}
