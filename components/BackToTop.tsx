"use client";

import { useState, useEffect } from "react";

/**
 * BackToTop — fixed bottom-right button that appears after scrolling 400px.
 *
 * props:
 *   policies  — when true, renders a minimal clean arrow button (no Norse styling)
 *               used on the Policies page which opts out of tier theme effects.
 */
export default function BackToTop({ policies = false }: { policies?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Set initial state in case page loads already scrolled
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "instant" : "smooth" });
  }

  const baseTransition =
    "transition-all duration-300 ease-in-out " +
    (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none");

  /* ── Policies page: clean minimal button, no Norse styling ────────────── */
  if (policies) {
    return (
      <button
        onClick={handleClick}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center text-lg ${baseTransition}`}
        style={{
          background: "var(--nrs-card)",
          border: "1px solid var(--nrs-border)",
          color: "var(--nrs-text-muted)",
        }}
      >
        ↑
      </button>
    );
  }

  /* ── Standard Norse-themed button ────────────────────────────────────── */
  return (
    <button
      onClick={handleClick}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center font-medium text-base select-none ${baseTransition}`}
      style={{
        background: "var(--nrs-btn-primary)",
        color: "var(--nrs-btn-primary-fg)",
        boxShadow: "0 0 16px var(--nrs-accent-glow), 0 2px 8px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-heading)",
        border: "1px solid var(--nrs-accent-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 28px var(--nrs-accent-glow), 0 4px 16px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 16px var(--nrs-accent-glow), 0 2px 8px rgba(0,0,0,0.4)";
      }}
    >
      {/* ᛏ Tiwaz rune — shaped like an upward arrow, Norse symbol of victory */}
      ᛏ
    </button>
  );
}
