"use client";

/**
 * NorseKnotworkFrame
 * ------------------
 * Renders a full Norse knotwork SVG border absolutely positioned over
 * its parent container. The frame consists of:
 *
 *  • Four corner knot pieces — two interlaced strands with proper
 *    over/under weaving and a triple-ring ornament at each corner tip
 *  • Continuous double-ribbon edges connecting the corners
 *  • Decorative boss nodes at the midpoint of each edge
 *
 * All strokes use currentColor (driven by var(--nrs-accent) on the parent)
 * and knockout fills use var(--nrs-bg-2) so the "under" strand gap matches
 * the image container background.
 *
 * Uses ResizeObserver to recalculate when the container resizes.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export default function NorseKnotworkFrame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);

  const measure = useCallback(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDim({ w: Math.round(rect.width), h: Math.round(rect.height) });
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
// Internal SVG renderer
// ─────────────────────────────────────────────────────────────────────────────

function KnotworkSVG({ w, h }: { w: number; h: number }) {
  // Corner piece occupies a 56×56 logical square at each corner.
  // The two ribbons in the corner are positioned at y=16 (outer) and y=28 (inner)
  // from each edge — these offsets define where the edge ribbons run.
  const C  = 56;   // corner size in px
  const SW = 4;    // ribbon stroke width
  const BW = 9;    // background knockout stroke width (creates "gap" for under-strand)

  // Edge ribbon offsets from frame edges
  const topY1 = 16, topY2 = 28;                  // top/bottom edge ribbon y positions
  const leftX1 = 14, leftX2 = 24;                // left/right edge ribbon x positions (matches corner exits)

  // Minimum size check — if container is too small, skip rendering
  if (w < C * 2 + 30 || h < C * 2 + 30) return null;

  // The accent colour is inherited via currentColor on the SVG element.
  // The knockout (background) colour matches the image container background.
  const bg = "var(--nrs-bg-2)";

  // Midpoints for boss decorations on each edge
  const midX = w / 2;
  const midY = h / 2;
  const midTopBossY = (topY1 + topY2) / 2;         // = 22
  const midLeftBossX = (leftX1 + leftX2) / 2;      // = 19

  // ── Corner strand paths (56×56 coordinate space, top-left orientation) ──
  //
  // Strand A (outer): enters from right at y=16, sweeps through the corner,
  //   exits at bottom at x=24. Goes OVER strand B at crossing ~(28, 28).
  const pathA  = "M 56,16 C 44,16 34,22 28,28 C 22,34 24,44 24,56";
  //
  // Strand B (inner): enters from right at y=28, curves through corner,
  //   exits at bottom at x=14. Passes UNDER strand A at the crossing.
  //   Split into two parts with a background-coloured gap at the crossing.
  const pathB1 = "M 56,28 C 48,28 38,28 30.5,27.5";          // before crossing
  const pathB2 = "M 25.5,28.5 C 18,30 14,36 14,56";          // after crossing
  // The gap knockout at the crossing — drawn in bg colour between B1 and B2:
  const pathBGap = "M 30.5,27.5 C 29,27.5 27,28 25.5,28.5";

  // ── Helper: render one corner's full stack of strokes ────────────────────
  // Draw order: knockouts first, then under-strand, then over-strand on top.
  const Corner = () => (
    <>
      {/* ── Background knockouts (create the "gap" / depth effect) ── */}
      {/* Gap for B at the crossing (covers B to show A passing over) */}
      <path d={pathBGap} stroke={bg} strokeWidth={BW + 2} strokeLinecap="round" fill="none" />
      {/* Full knockout for A (drawn behind A to give it a dark outline) */}
      <path d={pathA}  stroke={bg} strokeWidth={BW} strokeLinecap="round" fill="none" />
      {/* Full knockout for B (dark outline) */}
      <path d={pathB1} stroke={bg} strokeWidth={BW} strokeLinecap="round" fill="none" />
      <path d={pathB2} stroke={bg} strokeWidth={BW} strokeLinecap="round" fill="none" />
      {/* Corner boss ring knockout */}
      <circle cx="10" cy="10" r="7" stroke={bg} strokeWidth={BW} fill="none" />

      {/* ── Strand B (under-strand) — drawn first so A overlaps it ── */}
      <path d={pathB1} stroke="currentColor" strokeWidth={SW} strokeLinecap="round" fill="none" opacity={0.75} />
      <path d={pathB2} stroke="currentColor" strokeWidth={SW} strokeLinecap="round" fill="none" opacity={0.75} />

      {/* ── Strand A (over-strand) — drawn on top ── */}
      <path d={pathA}  stroke="currentColor" strokeWidth={SW} strokeLinecap="round" fill="none" />

      {/* ── Corner boss ornament — triple-ring knot at the extreme corner ── */}
      {/* Outer ring */}
      <circle cx="10" cy="10" r="7"   stroke="currentColor" strokeWidth={2}   fill="none" opacity={0.45} />
      {/* Middle ring */}
      <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.65} />
      {/* Centre dot */}
      <circle cx="10" cy="10" r="2"   fill="currentColor" opacity={0.5} />

      {/* ── Small terminal spirals at the strand exit points ── */}
      {/* These add an extra decorative flourish where the strands leave the corner */}
      {/* Top-edge exit (56,16): small arc hook */}
      <path d="M 56,16 A 5,5 0 0,0 56,12" stroke="currentColor" strokeWidth={SW * 0.6} strokeLinecap="round" fill="none" opacity={0.5}/>
      {/* Top-edge exit (56,28): small arc hook */}
      <path d="M 56,28 A 5,5 0 0,1 56,32" stroke="currentColor" strokeWidth={SW * 0.6} strokeLinecap="round" fill="none" opacity={0.4}/>
    </>
  );

  // ── Helper: boss node decoration ─────────────────────────────────────────
  const Boss = ({ cx, cy }: { cx: number; cy: number }) => (
    <>
      <circle cx={cx} cy={cy} r={5.5} stroke={bg} strokeWidth={BW * 0.7} fill="none" />
      <circle cx={cx} cy={cy} r={5.5} stroke="currentColor" strokeWidth={2}   fill="none" opacity={0.55} />
      <circle cx={cx} cy={cy} r={3}   stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.7}  />
      <circle cx={cx} cy={cy} r={1.2} fill="currentColor" opacity={0.5} />
    </>
  );

  // ── Helper: edge ribbon (two parallel lines, bg knockout then colour) ─────
  // For horizontal edges:
  const HRibbon = ({ x1, x2, y1, y2 }: { x1: number; x2: number; y1: number; y2: number }) => (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={bg} strokeWidth={BW} />
      <line x1={x1} y1={y2} x2={x2} y2={y2} stroke={bg} strokeWidth={BW} />
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke="currentColor" strokeWidth={SW} />
      <line x1={x1} y1={y2} x2={x2} y2={y2} stroke="currentColor" strokeWidth={SW} opacity={0.7} />
    </>
  );
  // For vertical edges:
  const VRibbon = ({ x1, x2, y1, y2 }: { x1: number; x2: number; y1: number; y2: number }) => (
    <>
      <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={bg} strokeWidth={BW} />
      <line x1={x2} y1={y1} x2={x2} y2={y2} stroke={bg} strokeWidth={BW} />
      <line x1={x1} y1={y1} x2={x1} y2={y2} stroke="currentColor" strokeWidth={SW} />
      <line x1={x2} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={SW} opacity={0.7} />
    </>
  );

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ position: "absolute", inset: 0 }}
      // Inherit accent colour from parent (set via CSS color property)
      color="inherit"
    >
      <defs>
        {/* Soft glow filter applied to the accent strands */}
        <filter id="nrs-knot-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Edges (drawn first so corners sit on top) ─────────────────────── */}

      {/* Top edge ribbons: y=16 and y=28, from x=C to x=w-C */}
      <HRibbon x1={C} x2={w - C} y1={topY1} y2={topY2} />

      {/* Bottom edge ribbons: y=h-16 and y=h-28, from x=C to x=w-C */}
      <HRibbon x1={C} x2={w - C} y1={h - topY1} y2={h - topY2} />

      {/* Left edge ribbons: x=14 and x=24, from y=C to y=h-C */}
      <VRibbon x1={leftX1} x2={leftX2} y1={C} y2={h - C} />

      {/* Right edge ribbons: x=w-14 and x=w-24, from y=C to y=h-C */}
      <VRibbon x1={w - leftX1} x2={w - leftX2} y1={C} y2={h - C} />

      {/* ── Midpoint boss nodes (decorative knot at edge centres) ─────────── */}

      {/* Top edge midpoint boss */}
      {w > C * 2 + 80 && <Boss cx={midX} cy={midTopBossY} />}

      {/* Bottom edge midpoint boss */}
      {w > C * 2 + 80 && <Boss cx={midX} cy={h - midTopBossY} />}

      {/* Left edge midpoint boss */}
      {h > C * 2 + 80 && <Boss cx={midLeftBossX} cy={midY} />}

      {/* Right edge midpoint boss */}
      {h > C * 2 + 80 && <Boss cx={w - midLeftBossX} cy={midY} />}

      {/* ── Quarter-point boss nodes on longer edges (extra elaboration) ──── */}

      {/* Top edge quarter bosses */}
      {w > C * 2 + 200 && (
        <>
          <Boss cx={C + (w - C * 2) * 0.25} cy={midTopBossY} />
          <Boss cx={C + (w - C * 2) * 0.75} cy={midTopBossY} />
        </>
      )}
      {/* Bottom edge quarter bosses */}
      {w > C * 2 + 200 && (
        <>
          <Boss cx={C + (w - C * 2) * 0.25} cy={h - midTopBossY} />
          <Boss cx={C + (w - C * 2) * 0.75} cy={h - midTopBossY} />
        </>
      )}
      {/* Left/right edge quarter bosses */}
      {h > C * 2 + 200 && (
        <>
          <Boss cx={midLeftBossX}     cy={C + (h - C * 2) * 0.25} />
          <Boss cx={midLeftBossX}     cy={C + (h - C * 2) * 0.75} />
          <Boss cx={w - midLeftBossX} cy={C + (h - C * 2) * 0.25} />
          <Boss cx={w - midLeftBossX} cy={C + (h - C * 2) * 0.75} />
        </>
      )}

      {/* ── Corner knot pieces (drawn last so they sit on top of edges) ───── */}

      {/* Top-left */}
      <g filter="url(#nrs-knot-glow)">
        <Corner />
      </g>

      {/* Top-right: mirror horizontally about x=w */}
      <g transform={`translate(${w}, 0) scale(-1, 1)`} filter="url(#nrs-knot-glow)">
        <Corner />
      </g>

      {/* Bottom-left: mirror vertically about y=h */}
      <g transform={`translate(0, ${h}) scale(1, -1)`} filter="url(#nrs-knot-glow)">
        <Corner />
      </g>

      {/* Bottom-right: mirror both axes */}
      <g transform={`translate(${w}, ${h}) scale(-1, -1)`} filter="url(#nrs-knot-glow)">
        <Corner />
      </g>
    </svg>
  );
}
