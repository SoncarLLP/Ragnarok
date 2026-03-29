"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/community";
import MentionTextarea from "./MentionTextarea";

const PRESET_CATEGORIES = CATEGORIES as readonly string[];

export default function CreatePostButton({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"text" | "photo" | "recipe">("text");
  const [content, setContent] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [method, setMethod] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setType("text");
    setContent("");
    setIngredients("");
    setMethod("");
    setSelectedCats([]);
    setCustomTag("");
    setImageFile(null);
    setImagePreview(null);
    setError("");
  }

  function toggleCat(cat: string) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function addCustomTag() {
    const tag = customTag.trim();
    if (!tag || selectedCats.includes(tag)) { setCustomTag(""); return; }
    setSelectedCats((prev) => [...prev, tag]);
    setCustomTag("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "photo" && !imageFile) { setError("Please select a photo."); return; }

    setSubmitting(true);
    setError("");
    const supabase = createClient();

    try {
      let image_url: string | null = null;

      if (type === "photo" && imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(path, imageFile);
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(path);
        image_url = publicUrl;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          type,
          content: content.trim() || null,
          image_url,
          ingredients: type === "recipe" ? ingredients.trim() || null : null,
          method: type === "recipe" ? method.trim() || null : null,
          categories: selectedCats,
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`${insertErr.message} [${insertErr.code ?? "?"}]`);

      // Process @mentions in the content field (fire-and-forget)
      if (inserted?.id && content.trim().includes("@")) {
        fetch("/api/community/mentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content.trim(), post_id: inserted.id }),
        }).catch(() => {});
      }

      reset();
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition font-medium"
      >
        + New Post
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 pt-8 pb-16">
          <div className="w-full max-w-lg bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h2 className="font-semibold">Create Post</h2>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-neutral-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {(["text", "photo", "recipe"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm capitalize transition ${
                      type === t
                        ? "bg-white/15 text-white"
                        : "bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Content — MentionTextarea enables @mention picker */}
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  {type === "recipe" ? "Recipe title / intro" : "What's on your mind?"}
                </label>
                <MentionTextarea
                  value={content}
                  onChange={setContent}
                  required={type !== "photo"}
                  rows={type === "recipe" ? 3 : 4}
                  className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 resize-none"
                />
                <p className="mt-1 text-xs text-neutral-600">
                  Type @ to mention a member
                </p>
              </div>

              {/* Photo upload */}
              {type === "photo" && (
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Photo</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full rounded-lg object-cover max-h-52"
                      />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-10 rounded-lg border border-dashed border-white/20 text-neutral-400 hover:text-white hover:border-white/40 text-sm transition"
                    >
                      Click to select a photo
                    </button>
                  )}
                </div>
              )}

              {/* Recipe fields */}
              {type === "recipe" && (
                <>
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Ingredients</label>
                    <textarea
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      rows={4}
                      placeholder="List your ingredients, one per line…"
                      className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Method</label>
                    <textarea
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      rows={4}
                      placeholder="Describe the steps…"
                      className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Categories */}
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Categories <span className="text-neutral-500">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCat(cat)}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        selectedCats.includes(cat)
                          ? "bg-amber-500/25 text-amber-300 border-amber-400/40"
                          : "bg-white/5 text-neutral-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {/* Custom tags (non-preset) */}
                  {selectedCats
                    .filter((c) => !PRESET_CATEGORIES.includes(c))
                    .map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCat(cat)}
                        className="px-3 py-1 rounded-full text-xs border bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      >
                        {cat} ×
                      </button>
                    ))}
                </div>
                {/* Custom tag input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                    placeholder="Add a custom tag…"
                    maxLength={40}
                    className="flex-1 rounded-md bg-neutral-800 border border-white/10 px-3 py-1.5 text-xs outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-medium transition"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </form>
          </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
