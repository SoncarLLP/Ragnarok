"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/site-management";

// Alias for clarity — ImageUploader works with ProductImage
type UploadedImage = ProductImage;

type Props = {
  productId: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
};

export default function ImageUploader({ productId, images, onImagesChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("alt_text", file.name.replace(/\.[^.]+$/, ""));

        const res = await fetch(`/api/site-management/products/${productId}/images`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Upload failed");
        }

        const { image } = await res.json();
        onImagesChange([...images, image]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [productId, images, onImagesChange]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      if (!confirm("Delete this image?")) return;
      try {
        const res = await fetch(
          `/api/site-management/products/${productId}/images/${imageId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Delete failed");
        const updated = images
          .filter((img) => img.id !== imageId)
          .map((img, i) => ({ ...img, position: i }));
        onImagesChange(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [productId, images, onImagesChange]
  );

  const handleSetPrimary = useCallback(
    async (imageId: string) => {
      const updated = images.map((img) => ({
        ...img,
        is_primary: img.id === imageId,
      }));
      onImagesChange(updated);
      await saveOrder(updated);
    },
    [images, onImagesChange] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const saveOrder = useCallback(
    async (updatedImages: UploadedImage[]) => {
      try {
        await fetch(`/api/site-management/products/${productId}/images`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: updatedImages.map((img) => ({
              id: img.id,
              position: img.position,
              is_primary: img.is_primary,
              url: img.url,
            })),
          }),
        });
      } catch {
        // Non-critical — order will be re-synced on next save
      }
    },
    [productId]
  );

  // Drag-to-reorder
  const handleItemDragStart = (index: number) => setDragIndex(index);
  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleItemDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }
      const reordered = [...images];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      const withPositions = reordered.map((img, i) => ({ ...img, position: i }));
      setDragIndex(null);
      setDragOverIndex(null);
      onImagesChange(withPositions);
      await saveOrder(withPositions);
    },
    [dragIndex, images, onImagesChange, saveOrder]
  );

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-8 gap-2 transition ${
          dragOver
            ? "border-amber-400/60 bg-amber-500/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/5"
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="animate-spin">⟳</span> Uploading...
          </div>
        ) : (
          <>
            <span className="text-2xl">📷</span>
            <p className="text-sm text-neutral-400">
              Drop images here or <span className="text-white">click to upload</span>
            </p>
            <p className="text-xs text-neutral-600">JPEG, PNG, WebP, GIF · max 10 MB</p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...images]
            .sort((a, b) => a.position - b.position)
            .map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => handleItemDragStart(index)}
                onDragOver={(e) => handleItemDragOver(e, index)}
                onDrop={(e) => handleItemDrop(e, index)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                className={`relative rounded-lg border overflow-hidden group cursor-grab active:cursor-grabbing transition ${
                  dragOverIndex === index
                    ? "border-amber-400/60 scale-105"
                    : img.is_primary
                    ? "border-amber-500/50"
                    : "border-white/10"
                }`}
              >
                <div className="bg-neutral-900 aspect-square">
                  <Image
                    src={img.url}
                    alt={img.alt_text || "Product image"}
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Primary badge */}
                {img.is_primary && (
                  <div className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-500/80 text-neutral-950 font-semibold">
                    Primary
                  </div>
                )}

                {/* Drag handle */}
                <div className="absolute top-1.5 right-1.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition text-sm">
                  ⠿
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-neutral-950/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img.id)}
                      className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 transition"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-neutral-600">Drag images to reorder. The primary image is shown in the shop.</p>
      )}
    </div>
  );
}
