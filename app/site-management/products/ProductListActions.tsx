"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "../components/ConfirmModal";

type Props = {
  productId: string;
  productName: string;
  productSlug: string;
};

export default function ProductListActions({ productId, productName }: Props) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/site-management/products/${productId}/duplicate`, {
        method: "POST",
      });
      const { product } = await res.json();
      if (product?.id) {
        router.push(`/site-management/products/${product.id}`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/site-management/products/${productId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={duplicating}
          title="Duplicate"
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:border-white/25 transition disabled:opacity-40"
        >
          {duplicating ? "…" : "⧉"}
        </button>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          title="Delete"
          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition"
        >
          🗑
        </button>
      </div>

      <ConfirmModal
        open={showDelete}
        title={`Delete "${productName}"?`}
        message="This will permanently delete the product and all its images. This action cannot be undone."
        confirmLabel="Delete permanently"
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
