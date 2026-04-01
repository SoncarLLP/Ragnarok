"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type SearchResult = {
  id:      string;
  type:    "product" | "post" | "member";
  title:   string;
  excerpt: string;
  url:     string;
  image:   string | null;
  meta:    string;
};

type SearchResults = {
  products:   SearchResult[];
  posts:      SearchResult[];
  members:    SearchResult[];
  total:      number;
  query:      string;
  didYouMean?: string;
};

const RECENT_KEY = "nrs_recent_searches_v1";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch { return []; }
}
function saveRecent(q: string) {
  const existing = getRecent().filter((s) => s !== q);
  const updated  = [q, ...existing].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /**/ }
}

const TYPE_ICON: Record<string, string> = {
  product: "🛒",
  post:    "💬",
  member:  "👤",
};

const TYPE_LABEL: Record<string, string> = {
  product: "Products",
  post:    "Posts",
  member:  "Members",
};

export default function SearchBar() {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<SearchResults | null>(null);
  const [loading, setLoading]   = useState(false);
  const [recent, setRecent]     = useState<string[]>([]);
  const [popular, setPopular]   = useState<string[]>([]);
  const inputRef    = useRef<HTMLInputElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecent(getRecent());
  }, []);

  // Load popular searches once (lazy)
  useEffect(() => {
    if (popular.length > 0) return;
    fetch("/api/search/popular")
      .then((r) => r.json())
      .then((d) => setPopular(d.popular ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=3`);
      const data = await res.json();
      setResults(data);
    } catch { /**/ }
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(val.trim()), 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    saveRecent(query.trim());
    setRecent(getRecent());
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleResultClick(url: string) {
    saveRecent(query.trim());
    setOpen(false);
    router.push(url);
  }

  function handleSuggestionClick(q: string) {
    setQuery(q);
    search(q);
  }

  const hasResults = results && results.total > 0;
  const allResults: SearchResult[] = results
    ? [...results.products, ...results.posts, ...results.members]
    : [];

  // Group results by type for display
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of allResults) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  // Suggestions to show in empty state
  const suggestions = recent.length > 0 ? recent : popular;
  const suggestionLabel = recent.length > 0 ? "Recent searches" : "Popular searches";

  return (
    <>
      {/* Search icon button in nav */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
        className="flex items-center justify-center w-8 h-8 rounded-lg transition hover:bg-white/10"
        style={{ color: "var(--nrs-text-muted)" }}
        title="Search (Ctrl+K)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {/* Search overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4 pb-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div
            ref={wrapperRef}
            className="w-full max-w-xl"
            style={{ position: "relative" }}
          >
            {/* Search input */}
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
                style={{
                  background:   "var(--nrs-bg-2, #1a1a2e)",
                  borderColor:  "var(--nrs-accent-border, rgba(201,168,76,0.3))",
                  boxShadow:    "0 20px 60px rgba(0,0,0,0.5)",
                }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: "var(--nrs-text-muted)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleChange}
                  placeholder="Search products, posts, members…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--nrs-text-body)", fontFamily: "var(--font-ui)" }}
                />
                {loading && (
                  <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>···</span>
                )}
                <kbd className="hidden sm:inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border"
                  style={{ color: "var(--nrs-text-muted)", borderColor: "var(--nrs-border-subtle, rgba(255,255,255,0.1))", fontFamily: "monospace", fontSize: "10px" }}>
                  Esc
                </kbd>
              </div>
            </form>

            {/* Dropdown */}
            <div className="mt-2 rounded-xl border overflow-hidden"
              style={{
                background:  "var(--nrs-bg-2, #1a1a2e)",
                borderColor: "var(--nrs-border, rgba(255,255,255,0.1))",
                boxShadow:   "0 20px 60px rgba(0,0,0,0.5)",
              }}>

              {/* Empty query — show recent or popular searches */}
              {!query.trim() && (
                <div className="p-3 space-y-1">
                  {suggestions.length > 0 ? (
                    <>
                      <p className="text-xs px-2 py-1 uppercase tracking-widest" style={{ color: "var(--nrs-text-muted)" }}>
                        {suggestionLabel}
                      </p>
                      {suggestions.map((r) => (
                        <button
                          key={r}
                          onClick={() => handleSuggestionClick(r)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left transition hover:bg-white/5"
                          style={{ color: "var(--nrs-text-body)" }}
                        >
                          {recent.length > 0 ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--nrs-text-muted)", flexShrink: 0 }}>
                              <path d="M12 2a10 10 0 1 0 10 10H12z"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--nrs-text-muted)", flexShrink: 0 }}>
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                              <polyline points="17 6 23 6 23 12"/>
                            </svg>
                          )}
                          {r}
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="text-xs text-center py-4" style={{ color: "var(--nrs-text-muted)" }}>
                      Start typing to search products, posts, and members
                    </p>
                  )}
                </div>
              )}

              {/* Zero results */}
              {query.trim() && !loading && results && !hasResults && (
                <div className="py-6 px-4 space-y-3">
                  <p className="text-sm text-center" style={{ color: "var(--nrs-text-muted)" }}>
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  {results.didYouMean && (
                    <p className="text-sm text-center">
                      <span style={{ color: "var(--nrs-text-muted)" }}>Did you mean </span>
                      <button
                        onClick={() => handleSuggestionClick(results.didYouMean!)}
                        className="font-medium underline"
                        style={{ color: "var(--nrs-accent)" }}
                      >
                        {results.didYouMean}
                      </button>
                      <span style={{ color: "var(--nrs-text-muted)" }}>?</span>
                    </p>
                  )}
                  <div className="flex justify-center gap-2 pt-1">
                    <Link
                      href="/#shop"
                      onClick={() => setOpen(false)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}
                    >
                      Browse Products
                    </Link>
                    <Link
                      href="/community"
                      onClick={() => setOpen(false)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--nrs-bg, rgba(255,255,255,0.05))", color: "var(--nrs-text-muted)" }}
                    >
                      Browse Community
                    </Link>
                  </div>
                </div>
              )}

              {/* Results */}
              {query.trim() && hasResults && (
                <div className="divide-y" style={{ borderColor: "var(--nrs-border, rgba(255,255,255,0.07))" }}>
                  {Object.entries(grouped).map(([type, items]) => (
                    <div key={type}>
                      <p className="text-xs px-4 py-2 font-semibold uppercase tracking-widest"
                        style={{ color: "var(--nrs-text-muted)", background: "var(--nrs-bg, #0a0a0f)", opacity: 0.7 }}>
                        {TYPE_LABEL[type] ?? type}
                      </p>
                      {items.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r.url)}
                          className="flex items-start gap-3 w-full px-4 py-2.5 text-left transition hover:bg-white/5"
                        >
                          {r.image ? (
                            <Image
                              src={r.image} alt={r.title}
                              width={32} height={32}
                              className="w-8 h-8 rounded object-cover shrink-0 mt-0.5"
                            />
                          ) : (
                            <span className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-base"
                              style={{ background: "var(--nrs-bg, #0a0a0f)" }}>
                              {TYPE_ICON[r.type] ?? "•"}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--nrs-text)" }}>
                              {highlightMatch(r.title, query)}
                            </p>
                            {r.excerpt && (
                              <p className="text-xs truncate" style={{ color: "var(--nrs-text-muted)" }}>
                                {r.excerpt}
                              </p>
                            )}
                          </div>
                          {r.meta && (
                            <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--nrs-accent)" }}>
                              {r.meta}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}

                  {/* See all results */}
                  <button
                    onClick={() => {
                      saveRecent(query.trim());
                      setOpen(false);
                      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                    }}
                    className="w-full px-4 py-3 text-sm text-center transition hover:bg-white/5"
                    style={{ color: "var(--nrs-accent)" }}
                  >
                    See all results for &ldquo;{query}&rdquo; →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Simple highlight: wraps matched substring in a <mark>. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", borderRadius: "2px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
