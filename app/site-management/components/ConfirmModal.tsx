"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-neutral-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
        <p className="text-sm text-neutral-400 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-white/15 text-neutral-400 hover:text-white hover:border-white/30 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              confirmDestructive
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
