"use client";

import { useState, useEffect, useCallback } from "react";

type TopQuery     = { query: string; count: number };
type ZeroResult   = { query: string; last_searched: string };
type DailyVolume  = { date: string; count: number };

type Analytics = {
  topWeek:     TopQuery[];
  topMonth:    TopQuery[];
  zeroResults: ZeroResult[];
  dailyVolume: DailyVolume[];
};

export default function SearchAnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [view, setView]       = useState<"week" | "month">("week");

  // Synonym quick-add from zero-results
  const [addingFor, setAddingFor]   = useState<string | null>(null);
  const [synonymInput, setSynonymInput] = useState("");
  const [savingSyn, setSavingSyn]   = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/search/analytics");
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function addSynonym(zeroTerm: string) {
    if (!synonymInput.trim()) return;
    setSavingSyn(true);
    const syns = synonymInput.split(",").map((s) => s.trim()).filter(Boolean);
    await fetch("/api/search/synonyms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: zeroTerm, synonyms: syns }),
    });
    setSavingSyn(false);
    setAddingFor(null);
    setSynonymInput("");
  }

  const topQueries = view === "week" ? (data?.topWeek ?? []) : (data?.topMonth ?? []);
  const maxCount   = topQueries.length > 0 ? topQueries[0].count : 1;

  // Daily chart
  const dailyMax   = data?.dailyVolume?.length
    ? Math.max(...data.dailyVolume.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Search Analytics</h1>
        <p className="text-neutral-400 text-sm mt-1">
          What members are searching for — use this to identify content gaps and popular interests.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Search Volume Chart */}
          {data && data.dailyVolume.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
                Search Volume — Last 30 Days
              </h2>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-end gap-1 h-24">
                  {data.dailyVolume.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-sm bg-amber-500/40 group-hover:bg-amber-500/60 transition"
                        style={{ height: `${Math.max(4, (d.count / dailyMax) * 80)}px` }}
                        title={`${d.date}: ${d.count} search${d.count !== 1 ? "es" : ""}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-neutral-600 mt-2">
                  <span>{data.dailyVolume[0]?.date}</span>
                  <span>{data.dailyVolume[data.dailyVolume.length - 1]?.date}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 text-right">
                  Total: {data.dailyVolume.reduce((s, d) => s + d.count, 0)} searches
                </p>
              </div>
            </section>
          )}

          {/* Top Searched Terms */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide flex-1">
                Top Searched Terms
              </h2>
              <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                {(["week", "month"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-xs rounded-md transition ${
                      view === v ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    This {v}
                  </button>
                ))}
              </div>
            </div>

            {topQueries.length === 0 ? (
              <p className="text-neutral-500 text-sm py-6 text-center">
                No search data for this period yet.
              </p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {topQueries.map((q, i) => (
                  <div
                    key={q.query}
                    className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition"
                  >
                    <span className="text-xs font-mono text-neutral-600 w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-neutral-200 truncate">{q.query}</span>
                        <span className="text-xs text-neutral-500 shrink-0">{q.count}×</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500/50 rounded-full"
                          style={{ width: `${(q.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Zero-Results Searches */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
                Searches With No Results
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Add synonyms to help members find what they&apos;re looking for.
              </p>
            </div>

            {(data?.zeroResults ?? []).length === 0 ? (
              <p className="text-neutral-500 text-sm py-6 text-center">
                No zero-result searches in the last 30 days — great!
              </p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {(data?.zeroResults ?? []).map((z) => (
                  <div
                    key={z.query}
                    className="border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-neutral-200">{z.query}</span>
                        <span className="ml-2 text-xs text-neutral-600">
                          {new Date(z.last_searched).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setAddingFor(addingFor === z.query ? null : z.query);
                          setSynonymInput("");
                        }}
                        className="shrink-0 text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition"
                      >
                        + Add synonym
                      </button>
                    </div>

                    {addingFor === z.query && (
                      <div className="px-4 pb-3 flex gap-2">
                        <input
                          value={synonymInput}
                          onChange={(e) => setSynonymInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addSynonym(z.query)}
                          placeholder="Comma-separated synonyms (e.g. freyja, freya bloom)"
                          className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-amber-400/40"
                          autoFocus
                        />
                        <button
                          onClick={() => addSynonym(z.query)}
                          disabled={savingSyn || !synonymInput.trim()}
                          className="px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-sm disabled:opacity-50"
                        >
                          {savingSyn ? "…" : "Save"}
                        </button>
                        <button
                          onClick={() => setAddingFor(null)}
                          className="px-3 py-1.5 rounded-md bg-white/5 text-neutral-400 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
