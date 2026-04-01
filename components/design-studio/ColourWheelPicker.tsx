"use client";

/**
 * ColourWheelPicker
 * A canvas-based HSL colour picker with:
 *  - Circular hue ring (outer)
 *  - Saturation/Lightness square (inner)
 *  - Alpha slider
 *  - Hex / RGB text inputs
 *  - Live colour preview
 */

import { useRef, useEffect, useCallback, useState } from "react";

export type HSLA = { h: number; s: number; l: number; a: number };

function hslaToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const col = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * col).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsla(hex: string): HSLA {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a: 100 };
}

function rgbaStringToHsla(rgba: string): HSLA | null {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  const r = parseInt(m[1]) / 255;
  const g = parseInt(m[2]) / 255;
  const b = parseInt(m[3]) / 255;
  const a = m[4] !== undefined ? Math.round(parseFloat(m[4]) * 100) : 100;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a };
}

function hslaToRgba(h: number, s: number, l: number, a: number): string {
  const hex = hslaToHex(h, s, l);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = (a / 100).toFixed(2);
  return a === 100 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

// Parse either hex or rgba string to HSLA
function parseColorToHsla(value: string): HSLA {
  const trimmed = value.trim();
  if (trimmed.startsWith("#") && (trimmed.length === 7 || trimmed.length === 4)) {
    const hex = trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
    return hexToHsla(hex);
  }
  const rgba = rgbaStringToHsla(trimmed);
  if (rgba) return rgba;
  return { h: 0, s: 0, l: 50, a: 100 };
}

const RING_WIDTH = 20;
const CANVAS_SIZE = 200;
const CENTER = CANVAS_SIZE / 2;
const OUTER_R = CENTER - 2;
const INNER_R = OUTER_R - RING_WIDTH;
const SQ_HALF = Math.floor(INNER_R * 0.68);

function drawWheel(ctx: CanvasRenderingContext2D) {
  // Hue ring
  for (let angle = 0; angle < 360; angle++) {
    const start = ((angle - 1) * Math.PI) / 180;
    const end = ((angle + 1) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, OUTER_R, start, end);
    ctx.closePath();
    ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
    ctx.fill();
  }
  // Mask centre to create ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, INNER_R, 0, 2 * Math.PI);
  ctx.fillStyle = "#1a1a22"; // matches design studio bg
  ctx.fill();
}

function drawSLSquare(ctx: CanvasRenderingContext2D, hue: number) {
  const x0 = CENTER - SQ_HALF;
  const y0 = CENTER - SQ_HALF;
  const size = SQ_HALF * 2;

  // White → colour gradient (left to right = saturation)
  const gradSat = ctx.createLinearGradient(x0, y0, x0 + size, y0);
  gradSat.addColorStop(0, "#ffffff");
  gradSat.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
  ctx.fillStyle = gradSat;
  ctx.fillRect(x0, y0, size, size);

  // Transparent → black gradient (top to bottom = lightness)
  const gradLit = ctx.createLinearGradient(x0, y0, x0, y0 + size);
  gradLit.addColorStop(0, "rgba(0,0,0,0)");
  gradLit.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = gradLit;
  ctx.fillRect(x0, y0, size, size);
}

function slSquarePos(s: number, l: number): { x: number; y: number } {
  // s=0 → left, s=100 → right; l=100 → top, l=0 → bottom
  // Map SL to x/y in the square
  const sl = s / 100;
  const ll = l / 100;
  // In the gradient: white(top-left) → hue(top-right) → black(bottom)
  // Approximate inverse: x = s-axis, y = (1-l)-axis
  const x = CENTER - SQ_HALF + sl * SQ_HALF * 2;
  const y = CENTER - SQ_HALF + (1 - ll) * SQ_HALF * 2;
  return { x, y };
}

function hueRingPos(hue: number): { x: number; y: number } {
  const angle = ((hue - 90) * Math.PI) / 180;
  const r = (OUTER_R + INNER_R) / 2;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

interface Props {
  label: string;
  value: string;           // hex or rgba string
  onChange: (val: string) => void;
  outputFormat?: "hex" | "rgba";
  compact?: boolean;
}

export default function ColourWheelPicker({ label, value, onChange, outputFormat = "hex", compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsla, setHsla] = useState<HSLA>(() => parseColorToHsla(value));
  const [hexInput, setHexInput] = useState(() => hslaToHex(hsla.h, hsla.s, hsla.l));
  const [dragging, setDragging] = useState<"ring" | "square" | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  // Keep local state in sync when value prop changes externally
  useEffect(() => {
    const parsed = parseColorToHsla(value);
    setHsla(parsed);
    setHexInput(hslaToHex(parsed.h, parsed.s, parsed.l));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = useCallback((h: HSLA) => {
    if (outputFormat === "rgba" || h.a < 100) {
      onChange(hslaToRgba(h.h, h.s, h.l, h.a));
    } else {
      onChange(hslaToHex(h.h, h.s, h.l));
    }
  }, [onChange, outputFormat]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawWheel(ctx);
    drawSLSquare(ctx, hsla.h);

    // Hue ring handle
    const rp = hueRingPos(hsla.h);
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, 7, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `hsl(${hsla.h}, 100%, 50%)`;
    ctx.fill();

    // SL square handle
    const sp = slSquarePos(hsla.s, hsla.l);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = hsla.l > 50 ? "#000" : "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hslaToHex(hsla.h, hsla.s, hsla.l);
    ctx.fill();
  }, [hsla]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleCanvasInteract = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const dx = x - CENTER;
    const dy = y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dragging === "ring" || (dist >= INNER_R && dist <= OUTER_R + 4)) {
      // Hue ring
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      const hue = ((angle % 360) + 360) % 360;
      const next = { ...hsla, h: Math.round(hue) };
      setHsla(next);
      setHexInput(hslaToHex(next.h, next.s, next.l));
      emit(next);
      setDragging("ring");
    } else if (dragging === "square" || (Math.abs(dx) <= SQ_HALF && Math.abs(dy) <= SQ_HALF)) {
      // SL square
      const sx = Math.max(0, Math.min(SQ_HALF * 2, x - (CENTER - SQ_HALF)));
      const sy = Math.max(0, Math.min(SQ_HALF * 2, y - (CENTER - SQ_HALF)));
      const s = Math.round((sx / (SQ_HALF * 2)) * 100);
      const l = Math.round((1 - sy / (SQ_HALF * 2)) * 100);
      const next = { ...hsla, s, l };
      setHsla(next);
      setHexInput(hslaToHex(next.h, next.s, next.l));
      emit(next);
      setDragging("square");
    }
  }, [dragging, hsla, emit]);

  const previewColor = hslaToHex(hsla.h, hsla.s, hsla.l);
  const previewRgba = hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a);

  // Compute colour harmonies
  const harmonies = {
    complementary: [(hsla.h + 180) % 360],
    triadic: [(hsla.h + 120) % 360, (hsla.h + 240) % 360],
    analogous: [(hsla.h + 30) % 360, (hsla.h + 330) % 360],
    "split-comp": [(hsla.h + 150) % 360, (hsla.h + 210) % 360],
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition"
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0"
          style={{ background: previewRgba }}
        />
        <span className="text-sm font-medium text-neutral-200 flex-1">{label}</span>
        <span className="text-xs font-mono text-neutral-500">{previewColor}</span>
        <span className="text-neutral-600 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Canvas wheel */}
          <div className="flex items-start gap-4">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="rounded-full cursor-crosshair shrink-0"
              style={{ width: 160, height: 160, background: "#1a1a22" }}
              onMouseDown={handleCanvasInteract}
              onMouseMove={(e) => { if (e.buttons === 1) handleCanvasInteract(e); }}
              onMouseUp={() => setDragging(null)}
              onTouchStart={handleCanvasInteract}
              onTouchMove={handleCanvasInteract}
              onTouchEnd={() => setDragging(null)}
            />
            <div className="flex-1 space-y-3 pt-1">
              {/* HSL individual sliders */}
              {[
                { label: "H", key: "h" as const, max: 360,
                  bg: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))` },
                { label: "S", key: "s" as const, max: 100,
                  bg: `linear-gradient(to right, hsl(${hsla.h},0%,${hsla.l}%), hsl(${hsla.h},100%,${hsla.l}%))` },
                { label: "L", key: "l" as const, max: 100,
                  bg: `linear-gradient(to right, #000, hsl(${hsla.h},${hsla.s}%,50%), #fff)` },
                { label: "A", key: "a" as const, max: 100,
                  bg: `linear-gradient(to right, rgba(0,0,0,0), ${previewColor})` },
              ].map(({ label: sl, key, max, bg }) => (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 font-mono w-4">{sl}</span>
                    <span className="text-xs text-neutral-400 font-mono">{hsla[key]}</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: bg }}>
                    <input
                      type="range"
                      min={0}
                      max={max}
                      value={hsla[key]}
                      onChange={(e) => {
                        const next = { ...hsla, [key]: parseInt(e.target.value) };
                        setHsla(next);
                        setHexInput(hslaToHex(next.h, next.s, next.l));
                        emit(next);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {/* Thumb indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none"
                      style={{
                        left: `calc(${(hsla[key] / max) * 100}% - 6px)`,
                        background: key === "h" ? `hsl(${hsla[key]},100%,50%)` : key === "a" ? previewRgba : previewColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hex + RGB inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Hex</label>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded shrink-0 border border-white/10" style={{ background: previewColor }} />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHexInput(v);
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      const parsed = hexToHsla(v);
                      const next = { ...parsed, a: hsla.a };
                      setHsla(next);
                      emit(next);
                    }
                  }}
                  placeholder="#rrggbb"
                  className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-mono text-neutral-100 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Output</label>
              <input
                type="text"
                value={previewRgba}
                readOnly
                className="w-full rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-xs font-mono text-neutral-400"
              />
            </div>
          </div>

          {/* Colour harmony suggestions */}
          <div>
            <p className="text-xs text-neutral-500 mb-2">Harmony suggestions</p>
            <div className="space-y-1.5">
              {(Object.entries(harmonies) as [string, number[]][]).map(([name, hues]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600 w-20 capitalize">{name}</span>
                  <div className="flex gap-1">
                    {hues.map((hue) => (
                      <button
                        key={hue}
                        type="button"
                        title={`Apply hue ${hue}°`}
                        onClick={() => {
                          const next = { ...hsla, h: hue };
                          setHsla(next);
                          setHexInput(hslaToHex(next.h, next.s, next.l));
                          emit(next);
                        }}
                        className="w-6 h-6 rounded-full border-2 border-white/10 hover:border-white/40 transition shrink-0"
                        style={{ background: `hsl(${hue}, ${hsla.s}%, ${hsla.l}%)` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
