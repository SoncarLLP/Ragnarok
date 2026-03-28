"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/community";

export default function CreatePostButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"text" | "photo" | "recipe">("text");
  const [content, setContent] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [method, setMethod] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setType("text");
    setContent("");
    setIngredients("");
    setMethod("");
    setSelectedCats([]);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCats.length === 0) { setError("Select at least one category."); return; }
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

      const { error: insertErr } = await supabase.from("posts").insert({
        user_id: userId,
        type,
        content: content.trim() || null,
        image_url,
        ingredients: type === "recipe" ? ingredients.trim() || null : null,
        method: type === "recipe" ? method.trim() || null : null,
        categories: selectedCats,
      });

      if (insertErr) throw new Error(insertErr.message);

      reset();
      setOpen(false);
      router.refresh();
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h2 className="font-semibold">Create Post</h2>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-neutral-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
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

              {/* Content */}
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  {type === "recipe" ? "Recipe title / intro" : "What's on your mind?"}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required={type !== "photo"}
                  rows={type === "recipe" ? 3 : 4}
                  className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 resize-none"
                />
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
                  Categories <span className="text-neutral-500">(select at least one)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
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
                </div>
              </div>

              {error && <p className="text-rose-400 text-sm">{error}</p>}

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
      )}
    </>
  );
}
