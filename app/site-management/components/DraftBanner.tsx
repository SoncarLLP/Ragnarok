"use client";

type Props = {
  hasChanges: boolean;
  lastSaved: string | null;
  saving: boolean;
  entityType: "product" | "site_content";
  entityId: string;
  onPublish: () => void;
  onDiscard: () => void;
  publishing: boolean;
};

export default function DraftBanner({
  hasChanges,
  lastSaved,
  saving,
  onPublish,
  onDiscard,
  publishing,
}: Props) {
  if (!hasChanges && !saving) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-amber-400">
          {saving ? (
            <span className="animate-spin inline-block">⟳</span>
          ) : (
            "⚑"
          )}
        </span>
        <div>
          <p className="text-amber-200 text-sm font-medium">
            {saving ? "Saving draft…" : "Unpublished changes"}
          </p>
          {lastSaved && !saving && (
            <p className="text-amber-300/60 text-xs">
              Last saved {new Date(lastSaved).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {!saving && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={publishing}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-neutral-400 hover:text-white hover:border-white/30 transition disabled:opacity-40"
          >
            Discard draft
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="text-xs px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold transition disabled:opacity-40 flex items-center gap-1.5"
          >
            {publishing ? (
              <>
                <span className="animate-spin">⟳</span> Publishing…
              </>
            ) : (
              "Publish"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
