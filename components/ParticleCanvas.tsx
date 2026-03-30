"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hue: number;
}

const THEME_CONFIG = {
  bronze:   { color: [201, 168,  76], type: "ember",  count: 22, speed: 0.35 },
  silver:   { color: [160, 120,  40], type: "ember",  count: 18, speed: 0.25 },
  gold:     { color: [212, 160,  23], type: "mote",   count: 20, speed: 0.2  },
  platinum: { color: [200, 216, 232], type: "snow",   count: 26, speed: 0.18 },
  fire:     { color: [232,  97,  10], type: "fire",   count: 30, speed: 0.5  },
  diamond:  { color: [167, 139, 250], type: "prism",  count: 24, speed: 0.22 },
} as const;

function createParticle(canvas: HTMLCanvasElement, type: string, speed: number): Particle {
  const x = Math.random() * canvas.width;
  const maxLife = 120 + Math.random() * 180;

  if (type === "fire") {
    return {
      x, y: canvas.height + 5,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(speed + Math.random() * speed),
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.6 + Math.random() * 0.4,
      life: 0, maxLife,
      hue: Math.random() * 40, // orange-red variation
    };
  } else if (type === "snow") {
    return {
      x, y: -5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: speed * 0.5 + Math.random() * speed * 0.5,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
      life: 0, maxLife,
      hue: 0,
    };
  } else {
    // ember, mote, prism — drift around, slight downward
    return {
      x, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.3 + 0.1,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.5,
      life: Math.random() * maxLife, // start at random phase
      maxLife,
      hue: Math.random() * 60 - 30,
    };
  }
}

export default function ParticleCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const animRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG.bronze;
    const { color, type, count, speed } = config;

    let particles: Particle[] = Array.from({ length: count }, () =>
      createParticle(canvas, type, speed)
    );

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
        p.x += p.vx + Math.sin(p.life * 0.03) * 0.3;
        p.y += p.vy;

        // Wrap / respawn
        const wrap = type === "fire"
          ? p.y < -10
          : type === "snow"
            ? p.y > canvas.height + 10
            : (p.life >= p.maxLife);

        if (wrap) {
          particles[i] = createParticle(canvas, type, speed);
          continue;
        }

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        const alpha = type === "fire" || type === "snow"
          ? p.opacity * Math.sin(lifeRatio * Math.PI)
          : p.opacity * (0.5 + 0.5 * Math.sin(lifeRatio * Math.PI * 2));

        // Prism: shift hue over time
        let r: number = color[0], g: number = color[1], b: number = color[2];
        if (type === "prism") {
          const t2 = (p.life * 0.5 + p.hue) % 360;
          const h  = t2 / 360;
          const q  = h < 0.5 ? h * 2 : 2 - h * 2;
          r = Math.round(255 * (h < 1/6 ? 1 : h < 2/6 ? q : h < 4/6 ? 0 : h < 5/6 ? q * 0.8 : 1) * 0.8 + color[0] * 0.2);
          g = Math.round(color[1] * 0.4 + 100 * h);
          b = Math.round(255 * (h > 0.5 ? 1 - (h - 0.5) * 2 : h * 2) * 0.6 + color[2] * 0.4);
        }

        ctx.beginPath();
        if (type === "snow") {
          // Hexagonal snowflake approximation — just a circle
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
        ctx.fill();

        // Glow for fire/prism
        if (type === "fire" || type === "prism") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha * 0.15)})`;
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
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
