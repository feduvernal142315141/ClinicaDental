"use client";

import { useEffect, useRef } from "react";

/**
 * Campo de partículas a la deriva (canvas) para el fondo de las vistas de auth.
 * - Brand-aware: lee el canal `--brand` del tema (light/dark) en runtime.
 * - Conecta partículas cercanas con líneas (efecto "constelación").
 * - Reactivo al cursor: las partículas cercanas se conectan y se apartan
 *   suavemente del puntero (parallax/repel).
 * - Respeta `prefers-reduced-motion` (no anima; campo estático tenue).
 * - DPR-aware + limpieza de RAF/listeners al desmontar. 100% decorativo.
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function AuthParticles({
  className,
  intensity = 1,
}: {
  className?: string;
  /** 0..1 — escala densidad y opacidad. */
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const k = Math.min(1, Math.max(0.15, intensity));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const brand =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--brand")
        .trim() || "37 99 235";

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width ?? window.innerWidth;
      height = rect?.height ?? window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        90,
        Math.max(18, Math.round(((width * height) / 22000) * k)),
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.2 + 1.2,
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = 150;
      const mouseDist = 180;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          // Repulsión suave respecto al cursor.
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const md = Math.hypot(mdx, mdy);
          if (md < mouseDist && md > 0.01) {
            const force = (1 - md / mouseDist) * 0.6;
            p.x += (mdx / md) * force;
            p.y += (mdy / md) * force;

            // Línea de la partícula al cursor (constelación viva).
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgb(${brand} / ${(1 - md / mouseDist) * 0.35 * k})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${brand} / ${0.85 * k})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgb(${brand} / ${(1 - dist / linkDist) * 0.32 * k})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion) rafId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseLeave);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
