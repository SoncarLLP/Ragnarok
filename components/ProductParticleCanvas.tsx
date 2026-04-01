"use client";

/**
 * ProductParticleCanvas
 * ----------------------
 * A canvas-based particle effect tailored for product pages.
 * Supports four effect types driven by the product's theme:
 *
 *  petals  — soft rose petals drifting and rotating (Freyja's Bloom)
 *  droplets — warm golden droplets falling (Dümmens Nectar)
 *  embers   — hellfire sparks rising upward (Loki Hell Fire)
 *  sparks   — bright shooting sparks
 *  none     — no effect
 *
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";
import type { ParticleEffectType } from "@/lib/site-management";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  hue: number;
}

interface EffectConfig {
  color: [number, number, number];
  count: number;
  speed: number;
}

const EFFECT_CONFIGS: Record<ParticleEffectType, EffectConfig | null> = {
  petals:     { color: [212, 152, 172], count: 20, speed: 0.22 },
  droplets:   { color: [212, 152,  10], count: 18, speed: 0.28 },
  embers:     { color: [232,  80,  16], count: 28, speed: 0.48 },
  sparks:     { color: [255, 180,  60], count: 24, speed: 0.6  },
  snowflakes: { color: [200, 230, 255], count: 22, speed: 0.18 },
  leaves:     { color: [ 80, 160,  60], count: 18, speed: 0.20 },
  stars:      { color: [200, 180, 255], count: 26, speed: 0.15 },
  dust:       { color: [200, 195, 185], count: 30, speed: 0.10 },
  none:       null,
};

function createParticle(
  canvas: HTMLCanvasElement,
  type: ParticleEffectType,
  speed: number
): Particle {
  const maxLife = 140 + Math.random() * 160;

  if (type === "embers" || type === "sparks") {
    // Rise upward from the bottom
    return {
      x: Math.random() * canvas.width,
      y: canvas.height + 8,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(speed + Math.random() * speed * 1.2),
      size: type === "sparks" ? 1 + Math.random() * 1.5 : 1.5 + Math.random() * 2.5,
      opacity: 0.55 + Math.random() * 0.45,
      life: 0,
      maxLife,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      hue: Math.random() * 50 - 10,
    };
  }

  if (type === "droplets") {
    // Fall downward like golden drops
    return {
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: speed * 0.8 + Math.random() * speed * 0.4,
      size: 1.5 + Math.random() * 2,
      opacity: 0.4 + Math.random() * 0.4,
      life: 0,
      maxLife,
      rotation: 0,
      rotationSpeed: 0,
      hue: Math.random() * 30 - 15,
    };
  }

  // petals — drift across the canvas with gentle rotation
  return {
    x: Math.random() * canvas.width,
    y: -15,
    vx: (Math.random() - 0.5) * 0.6,
    vy: speed * 0.5 + Math.random() * speed * 0.4,
    size: 2.5 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.45,
    life: 0,
    maxLife,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.04,
    hue: Math.random() * 30 - 15,
  };
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  r: number, g: number, b: number,
  alpha: number
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  // Simple oval petal shape
  ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fill();
  // Inner highlight
  ctx.beginPath();
  ctx.ellipse(p.size * 0.1, -p.size * 0.2, p.size * 0.25, p.size * 0.5, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,220,240,${alpha * 0.3})`;
  ctx.fill();
  ctx.restore();
}

function drawDroplet(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  r: number, g: number, b: number,
  alpha: number
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.beginPath();
  // Teardrop — circle at bottom, pointed top
  const s = p.size;
  ctx.moveTo(0, -s * 1.6);
  ctx.bezierCurveTo(s * 0.8, -s * 0.6, s * 0.8, s * 0.4, 0, s);
  ctx.bezierCurveTo(-s * 0.8, s * 0.4, -s * 0.8, -s * 0.6, 0, -s * 1.6);
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fill();
  // Highlight
  ctx.beginPath();
  ctx.ellipse(-s * 0.2, -s * 0.5, s * 0.2, s * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,240,200,${alpha * 0.4})`;
  ctx.fill();
  ctx.restore();
}

interface Props {
  effectType: ParticleEffectType;
  className?: string;
}

export default function ProductParticleCanvas({ effectType, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (effectType === "none") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = EFFECT_CONFIGS[effectType];
    if (!config) return;
    const { color, count, speed } = config;

    // Seed particles at random positions so they don't all appear at once
    let particles: Particle[] = Array.from({ length: count }, () => {
      const p = createParticle(canvas, effectType, speed);
      // Start at random Y so the canvas doesn't look empty on load
      if (effectType === "petals" || effectType === "droplets") {
        p.y = Math.random() * canvas.height;
        p.life = Math.random() * p.maxLife;
      } else {
        // embers / sparks start at random heights
        p.y = Math.random() * canvas.height;
      }
      return p;
    });

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin(p.life * 0.025) * 0.4;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Respawn condition
        const done =
          (effectType === "embers" || effectType === "sparks") ? p.y < -10 :
          (effectType === "droplets") ? p.y > canvas.height + 15 :
          p.y > canvas.height + 20 || p.life >= p.maxLife;

        if (done) {
          particles[i] = createParticle(canvas, effectType, speed);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (effectType === "embers" || effectType === "sparks") {
          alpha = p.opacity * Math.sin(lifeRatio * Math.PI);
        } else if (effectType === "droplets") {
          alpha = p.opacity * (0.4 + 0.6 * Math.sin(lifeRatio * Math.PI));
        } else {
          // petals — gentle fade in/out
          alpha = p.opacity * Math.sin(lifeRatio * Math.PI);
        }

        const [r0, g0, b0] = color;
        // Slight hue variation per particle
        const r = Math.min(255, r0 + p.hue);
        const g = Math.max(0,   g0 + Math.abs(p.hue) * 0.3);
        const b = Math.max(0,   b0 + p.hue * 0.5);
        const clampedAlpha = Math.max(0, Math.min(1, alpha));

        if (effectType === "petals") {
          drawPetal(ctx, p, r, g, b, clampedAlpha);
        } else if (effectType === "droplets") {
          drawDroplet(ctx, p, r, g, b, clampedAlpha);
        } else {
          // embers / sparks — glowing dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${clampedAlpha})`;
          ctx.fill();
          // Outer glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${clampedAlpha * 0.12})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [effectType]);

  if (effectType === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
