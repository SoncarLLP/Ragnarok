"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/community";
import MentionTextarea from "./MentionTextarea";

const PRESET_CATEGORIES = CATEGORIES as readonly string[];

const PIN_OPTIONS = [
  { value: "none",        label: "Do not pin" },
  { value: "24h",         label: "Pin for 24 hours" },
  { value: "3d",          label: "Pin for 3 days" },
  { value: "7d",          label: "Pin for 7 days" },
  { value: "14d",         label: "Pin for 14 days" },
  { value: "30d",         label: "Pin for 30 days" },
  { value: "indefinite",  label: "Pin indefinitely (super admin only)" },
] as const;

type PinValue = (typeof PIN_OPTIONS)[number]["value"];

function pinValueToTimestamp(value: PinValue): { pinned_until: string | null; pin_indefinite: boolean } {
  if (value === "none") return { pinned_until: null, pin_indefinite: false };
  if (value === "indefinite") return { pinned_until: null, pin_indefinite: true };
  const durations: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "3d":  3  * 24 * 60 * 60 * 1000,
    "7d":  7  * 24 * 60 * 60 * 1000,
    "14d": 14 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return {
    pinned_until: new Date(Date.now() + durations[value]).toISOString(),
    pin_indefinite: false,
  };
}

export default function CreatePostButton({
  userId,
  userRole,
}: {
  userId: string;
  userRole?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAdminOrAbove = userRole === "admin" || userRole === "super_admin";
  const isSuperAdmin   = userRole === "super_admin";

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

  // Official post fields
  const [postingAs, setPostingAs] = useState<"self" | "team">("self");
  const [pinOption, setPinOption] = useState<PinValue>("none");

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
    setPostingAs("self");
    setPinOption("none");
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

  // When switching away from team mode, reset pin option
  function handlePostingAsChange(value: "self" | "team") {
    setPostingAs(value);
    if (value === "self") setPinOption("none");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "photo" && !imageFile) { setError("Please select a photo."); return; }

    // Validate pin option permissions
    if (postingAs === "team" && pinOption === "indefinite" && !isSuperAdmin) {
      setError("Only super admins can pin indefinitely.");
      return;
    }

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

      // Build official post fields
      const isTeamPost = postingAs === "team" && isAdminOrAbove;
      const roleForPost = isTeamPost
        ? (userRole as "admin" | "super_admin")
        : null;
      const { pinned_until, pin_indefinite } = isTeamPost
        ? pinValueToTimestamp(pinOption)
        : { pinned_until: null, pin_indefinite: false };

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
          post_as_role: roleForPost,
          pinned_until,
          pin_indefinite,
          created_by_role: roleForPost,
          created_by_user_id: isTeamPost ? userId : null,
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

  // Filter pin options: remove "indefinite" for non-super-admins
  const availablePinOptions = PIN_OPTIONS.filter(
    (o) => o.value !== "indefinite" || isSuperAdmin
  );

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

              {/* Post as — admin/super_admin only */}
              {isAdminOrAbove && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    Post as
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePostingAsChange("self")}
                      className={`flex-1 py-2 rounded-lg text-sm transition ${
                        postingAs === "self"
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePostingAsChange("team")}
                      className={`flex-1 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1.5 ${
                        postingAs === "team"
                          ? "bg-amber-500/25 text-amber-300 border border-amber-400/30"
                          : "bg-white/5 text-neutral-400 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="text-base">🛡️</span>
                      SONCAR Team
                    </button>
                  </div>

                  {/* Pin options — shown when posting as SONCAR Team */}
                  {postingAs === "team" && (
                    <div className="pt-2 border-t border-white/10">
                      <label className="block text-xs text-neutral-400 mb-1.5">
                        Pin this post
                      </label>
                      <select
                        value={pinOption}
                        onChange={(e) => setPinOption(e.target.value as PinValue)}
                        className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-white/30"
                      >
                        {availablePinOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

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
                className={`w-full py-2.5 rounded-lg disabled:opacity-60 text-sm font-medium transition ${
                  postingAs === "team"
                    ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-200"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {submitting
                  ? "Posting…"
                  : postingAs === "team"
                  ? "Post as SONCAR Team"
                  : "Post"}
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
