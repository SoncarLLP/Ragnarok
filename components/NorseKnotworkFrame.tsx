"use client";

/**
 * NorseKnotworkFrame
 * ------------------
 * A genuine Celtic/Norse interlaced knotwork SVG border.
 *
 * Design:
 *  • Edges  — classic 2-strand running braid (the "basic plait" found on
 *    Viking-Age carved stones, metalwork and illuminated manuscripts).
 *    Two ribbons weave sinusoidally, crossing over and under each other
 *    with alternating depth at every half-period. The over/under illusion
 *    is achieved by drawing background-coloured knockout gaps on the
 *    "under" strand at each crossing, then re-drawing the "over" strand
 *    on top — exactly the technique used in genuine knotwork art.
 *
 *  • Corners — a 2-crossing corner knot where the two strands swap sides
 *    as they turn 90°. The strands weave once, creating the interlaced
 *    "endless" quality characteristic of Norse corner knotwork.
 *    A triquetra-inspired terminal ornament marks the corner tip.
 *
 * All strokes use `currentColor` (set via `color: var(--nrs-accent)` on
 * the parent) and knockout fills use `var(--nrs-bg-2)` to match the
 * image container background, giving clean depth at any theme colour.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export default function NorseKnotworkFrame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);

  const measure = useCallback(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDim({ w: Math.round(r.width), h: Math.round(r.height) });
  }, []);

  useEffect(() => {
    measure();
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}
      aria-hidden="true"
    >
      {dim && <KnotworkSVG w={dim.w} h={dim.h} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function KnotworkSVG({ w, h }: { w: number; h: number }) {
  // Visual constants
  const C  = 64;   // corner piece size (px)
  const SW = 3.5;  // ribbon stroke width
  const BW = 8;    // background knockout width  (SW + gap)
  const P  = 44;   // braid period (px) — one full over/under cycle

  // Edge ribbon positions relative to each edge
  // Top/bottom edge: ribbons at these y-coordinates (from that edge)
  const R1 = 13;   // outer ribbon
  const R2 = 25;   // inner ribbon
  // The centre-line of the braid band
  const RC = (R1 + R2) / 2; // = 19

  // Left/right edge ribbons match the corner strand exit x-coordinates
  const LX1 = 13;  // outer
  const LX2 = 25;  // inner

  const bg = "var(--nrs-bg-2)";

  if (w < C * 2 + 20 || h < C * 2 + 20) return null;

  // ── Braid edge helpers ───────────────────────────────────────────────────

  /**
   * Generate the draw-call list for a horizontal braid between x=x0..x1
   * with the two ribbons at y=ya (upper) and y=yb (lower).
   * Returns an array of <path> elements in correct draw order.
   */
  function hBraid(x0: number, x1: number, ya: number, yb: number) {
    const L = x1 - x0;
    const n = Math.floor(L / P);
    const rem = L - n * P;
    // Shift so the braid is centred in the available space
    const ox = x0 + rem / 2;

    const elements: React.ReactElement[] = [];

    // --- pass 1: BG knockouts for all periods (both strands) ---
    let dA = "", dB = "";
    for (let i = 0; i < n; i++) {
      const x = ox + i * P;
      dA += ` M ${x},${ya} C ${x+P/4},${ya} ${x+P/4},${yb} ${x+P/2},${yb} C ${x+3*P/4},${yb} ${x+3*P/4},${ya} ${x+P},${ya}`;
      dB += ` M ${x},${yb} C ${x+P/4},${yb} ${x+P/4},${ya} ${x+P/2},${ya} C ${x+3*P/4},${ya} ${x+3*P/4},${yb} ${x+P},${yb}`;
    }
    if (dA) {
      elements.push(<path key="bgA" d={dA} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>);
      elements.push(<path key="bgB" d={dB} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>);
    }

    // --- pass 2+3+4+5: per-period over/under layering ---
    for (let i = 0; i < n; i++) {
      const x = ox + i * P;

      // Crossing C1 at x+P/4 — A goes OVER B
      // Crossing C2 at x+3P/4 — B goes OVER A
      // De Casteljau sub-paths for the "under" segment gaps (computed from P/4 split at t=0.5):
      // For B at C1: B's first half ends at (x+P/4, RC), second half starts there.
      // Gap on B: draw second half of B segment 1 in bg, then redraw A over it.
      const c1x = x + P / 4;  // crossing 1 x
      const c2x = x + 3*P/4;  // crossing 2 x
      // De Casteljau at t=0.5 for segment M x0,yb C x+P/4,yb x+P/4,ya x+P/2,ya:
      //   first-half control points: (x+P/8, yb), (x+3P/16, RC-3.5)
      //   (RC-3.5 = (yb-ya)/2 · partial, here = RC - (RC-ya)*0.5 = 19 - 3 = 16)
      const dy = (yb - ya) / 2; // half the band height = 6
      // Second half of B's seg1 (from C1 to midpoint): M c1x,RC C c1x+P/8,RC-dy c1x+P/4,ya ...
      // We only need to kill the short approach to the crossing:
      const gapH = dy * 1.4; // half-gap height

      // ── draw B (full period, will be partially hidden below) ──
      elements.push(
        <path key={`B${i}`}
          d={`M ${x},${yb} C ${x+P/4},${yb} ${x+P/4},${ya} ${x+P/2},${ya} C ${x+3*P/4},${ya} ${x+3*P/4},${yb} ${x+P},${yb}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.85}
        />
      );
      // ── gap on B at C1 (A over B): knockout the B segment at x=C1 ──
      // The gap is a short segment centred on the crossing, following B's path direction
      elements.push(
        <path key={`gapB${i}`}
          d={`M ${c1x - P/8},${ya + dy * 0.5} C ${c1x - P/16},${ya + dy * 0.25} ${c1x + P/16},${ya - dy * 0.25} ${c1x + P/8},${ya - dy * 0.5}`}
          stroke={bg} strokeWidth={BW + 3} fill="none" strokeLinecap="round"
        />
      );
      // ── redraw A at C1 (on top) ──
      elements.push(
        <path key={`A1${i}`}
          d={`M ${x},${ya} C ${x+P/4},${ya} ${x+P/4},${yb} ${c1x + P/4},${yb}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round"
        />
      );

      // ── draw A (full period, will be partially hidden at C2) ──
      elements.push(
        <path key={`A${i}`}
          d={`M ${x},${ya} C ${x+P/4},${ya} ${x+P/4},${yb} ${x+P/2},${yb} C ${x+3*P/4},${yb} ${x+3*P/4},${ya} ${x+P},${ya}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round"
        />
      );
      // ── gap on A at C2 (B over A) ──
      elements.push(
        <path key={`gapA${i}`}
          d={`M ${c2x - P/8},${yb - dy * 0.5} C ${c2x - P/16},${yb - dy * 0.25} ${c2x + P/16},${yb + dy * 0.25} ${c2x + P/8},${yb + dy * 0.5}`}
          stroke={bg} strokeWidth={BW + 3} fill="none" strokeLinecap="round"
        />
      );
      // ── redraw B at C2 (on top) ──
      elements.push(
        <path key={`B2${i}`}
          d={`M ${x + P/2},${ya} C ${x+3*P/4},${ya} ${x+3*P/4},${yb} ${x+P},${yb}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.85}
        />
      );
    }

    return elements;
  }

  /** Same for a vertical braid between y=y0..y1 at x=xa (outer) and x=xb (inner). */
  function vBraid(y0: number, y1: number, xa: number, xb: number) {
    const L = y1 - y0;
    const n = Math.floor(L / P);
    const rem = L - n * P;
    const oy = y0 + rem / 2;

    const elements: React.ReactElement[] = [];

    let dA = "", dB = "";
    for (let i = 0; i < n; i++) {
      const y = oy + i * P;
      dA += ` M ${xa},${y} C ${xa},${y+P/4} ${xb},${y+P/4} ${xb},${y+P/2} C ${xb},${y+3*P/4} ${xa},${y+3*P/4} ${xa},${y+P}`;
      dB += ` M ${xb},${y} C ${xb},${y+P/4} ${xa},${y+P/4} ${xa},${y+P/2} C ${xa},${y+3*P/4} ${xb},${y+3*P/4} ${xb},${y+P}`;
    }
    if (dA) {
      elements.push(<path key="bgA" d={dA} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>);
      elements.push(<path key="bgB" d={dB} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>);
    }

    for (let i = 0; i < n; i++) {
      const y = oy + i * P;
      const c1y = y + P / 4;
      const c2y = y + 3 * P / 4;
      const dx = (xb - xa) / 2; // half band width = 6

      elements.push(
        <path key={`B${i}`}
          d={`M ${xb},${y} C ${xb},${y+P/4} ${xa},${y+P/4} ${xa},${y+P/2} C ${xa},${y+3*P/4} ${xb},${y+3*P/4} ${xb},${y+P}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.85}
        />
      );
      elements.push(
        <path key={`gapB${i}`}
          d={`M ${xa + dx * 0.5},${c1y - P/8} C ${xa + dx * 0.25},${c1y - P/16} ${xa - dx * 0.25},${c1y + P/16} ${xa - dx * 0.5},${c1y + P/8}`}
          stroke={bg} strokeWidth={BW + 3} fill="none" strokeLinecap="round"
        />
      );
      elements.push(
        <path key={`A1${i}`}
          d={`M ${xa},${y} C ${xa},${y+P/4} ${xb},${y+P/4} ${xb},${c1y + P/4}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round"
        />
      );
      elements.push(
        <path key={`A${i}`}
          d={`M ${xa},${y} C ${xa},${y+P/4} ${xb},${y+P/4} ${xb},${y+P/2} C ${xb},${y+3*P/4} ${xa},${y+3*P/4} ${xa},${y+P}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round"
        />
      );
      elements.push(
        <path key={`gapA${i}`}
          d={`M ${xb - dx * 0.5},${c2y - P/8} C ${xb - dx * 0.25},${c2y - P/16} ${xb + dx * 0.25},${c2y + P/16} ${xb + dx * 0.5},${c2y + P/8}`}
          stroke={bg} strokeWidth={BW + 3} fill="none" strokeLinecap="round"
        />
      );
      elements.push(
        <path key={`B2${i}`}
          d={`M ${xb},${y+P/2} C ${xb},${y+3*P/4} ${xa},${y+3*P/4} ${xa},${y+P}`}
          stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.85}
        />
      );
    }

    return elements;
  }

  // ── Corner knot (top-left, 64×64 space) ─────────────────────────────────
  // Strand A enters from right at y=R1=13, exits bottom at x=LX2=25 (strand SWAPS side).
  // Strand B enters from right at y=R2=25, exits bottom at x=LX1=13 (strand SWAPS side).
  // They cross once at approximately (38, 24) where A goes OVER B.
  // The swap-and-cross is the defining feature of a Norse knotwork corner.
  const cornerA  = `M 64,${R1} C 52,${R1} 42,17 36,24 C 30,31 28,42 ${LX2},64`;
  const cornerB1 = `M 64,${R2} C 56,${R2} 46,26 39.5,25`;   // B before crossing
  const cornerB2 = `M 36.5,23 C 28,22 18,30 ${LX1},64`;      // B after crossing

  // The corner boss at (10,10): a small three-arc triquetra
  // Three overlapping loops forming the classic trefoil/triquetra motif
  const tq1 = `M 10,4 C 17,3 20,10 16,15 C 12,20 5,19 4,14 C 3,9 6,3 10,4`;
  const tq2 = `M 10,4 A 7,7 0 1,0 10.001,4`;  // fallback circle if triquetra paths fail

  const CornerPaths = () => (
    <>
      {/* ── Background knockouts (depth shadow) ── */}
      <path d={cornerA}  stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>
      <path d={cornerB1} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>
      <path d={cornerB2} stroke={bg} strokeWidth={BW} fill="none" strokeLinecap="round"/>

      {/* ── Strand B parts (goes UNDER A at the crossing) ── */}
      <path d={cornerB1} stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.8}/>
      {/* Knockout gap on B at the crossing — drawn over B1 to create under-illusion */}
      <path
        d="M 39.5,25 C 38.5,25 37.5,24.3 36.5,23"
        stroke={bg} strokeWidth={BW + 4} fill="none" strokeLinecap="round"
      />
      <path d={cornerB2} stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round" opacity={0.8}/>

      {/* ── Strand A (goes OVER B) — drawn on top ── */}
      <path d={cornerA} stroke="currentColor" strokeWidth={SW} fill="none" strokeLinecap="round"/>

      {/* ── Triquetra corner boss at (10,10) ── */}
      {/* Three interlaced arc loops — classic Norse corner ornament */}
      {/* BG knockouts for triquetra */}
      <path d={tq1} stroke={bg} strokeWidth={BW - 1} fill="none"/>
      {/* Over/under weave: three arcs each going over one neighbour */}
      {/* Arc 1: upper lobe */}
      <path d="M 10,4 C 17,3 20,10 16,15"  stroke="currentColor" strokeWidth={SW - 0.5} fill="none" opacity={0.7}/>
      {/* Arc 2: lower-right lobe */}
      <path d="M 16,15 C 12,20 5,19 4,14"  stroke="currentColor" strokeWidth={SW - 0.5} fill="none" opacity={0.7}/>
      {/* Arc 3: lower-left lobe */}
      <path d="M 4,14 C 3,9 6,3 10,4"      stroke="currentColor" strokeWidth={SW - 0.5} fill="none" opacity={0.7}/>
      {/* Small centre ring */}
      <circle cx="10" cy="11" r="2" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.55}/>
      <circle cx="10" cy="11" r="0.9" fill="currentColor" opacity={0.45}/>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      color="inherit"
      style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        {/* Soft ambient glow applied to the overall frame */}
        <filter id="knot-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#knot-glow)">
        {/* ── Top edge braid: y=R1..R2, from x=C to x=w-C ── */}
        {hBraid(C, w - C, R1, R2)}

        {/* ── Bottom edge braid ── */}
        {hBraid(C, w - C, h - R2, h - R1)}

        {/* ── Left edge braid: x=LX1..LX2, from y=C to y=h-C ── */}
        {vBraid(C, h - C, LX1, LX2)}

        {/* ── Right edge braid ── */}
        {vBraid(C, h - C, w - LX2, w - LX1)}

        {/* ── Corners ── */}
        {/* Top-left */}
        <g><CornerPaths /></g>

        {/* Top-right: mirror X */}
        <g transform={`translate(${w},0) scale(-1,1)`}><CornerPaths /></g>

        {/* Bottom-left: mirror Y */}
        <g transform={`translate(0,${h}) scale(1,-1)`}><CornerPaths /></g>

        {/* Bottom-right: mirror both */}
        <g transform={`translate(${w},${h}) scale(-1,-1)`}><CornerPaths /></g>
      </g>
    </svg>
  );
}
