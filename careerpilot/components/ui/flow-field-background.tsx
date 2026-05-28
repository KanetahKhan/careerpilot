"use client";

import { useRef, useEffect, useCallback, useState } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Props = {
  particleCount?: number;
  particleRadius?: number;
  color?: string;
  fadeColor?: string;
  connectionDistance?: number;
  mouseInfluenceRadius?: number;
  mouseRepelStrength?: number;
  speed?: number;
  className?: string;
  interactive?: boolean;
};

const MOBILE_BREAKPOINT = 768;

export default function FlowFieldBackground({
  particleCount,
  particleRadius: pr,
  color: colorProp,
  fadeColor,
  connectionDistance = 120,
  mouseInfluenceRadius = 180,
  mouseRepelStrength = 4,
  speed = 0.8,
  className,
  interactive = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -10000, y: -10000, active: false });
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: colorProp || style.getPropertyValue("--primary").trim() || "#a78bfa",
      bg: fadeColor || style.getPropertyValue("--background").trim() || "#000000",
    };
  }, [colorProp, fadeColor]);

  const initParticles = useCallback(
    (w: number, h: number) => {
      const isMobile = w < MOBILE_BREAKPOINT;
      const count = particleCount ?? (isMobile ? 40 : 80);
      const radius = pr ?? (isMobile ? 1.2 : 1.8);
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: radius * (0.5 + Math.random()),
      }));
    },
    [particleCount, pr, speed],
  );

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animating = true;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) initParticles(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const container = containerRef.current;
    let onMouse: ((e: MouseEvent) => void) | undefined;
    let onMouseLeave: (() => void) | undefined;
    if (interactive) {
      onMouse = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      };
      onMouseLeave = () => {
        mouseRef.current = { x: -10000, y: -10000, active: false };
      };
      if (onMouse) container?.addEventListener("mousemove", onMouse);
      if (onMouseLeave) container?.addEventListener("mouseleave", onMouseLeave);
    }

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const loop = () => {
      if (!animating) return;
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const { primary, bg } = getColors();
      const w = window.innerWidth;
      const h = window.innerHeight;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (interactive && mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseInfluenceRadius && dist > 0) {
            const force = (mouseInfluenceRadius - dist) / mouseInfluenceRadius;
            p.vx += (dx / dist) * force * mouseRepelStrength * 0.1;
            p.vy += (dy / dist) * force * mouseRepelStrength * 0.1;
          }
        }

        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > h) { p.y = h; p.vy *= -1; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.4 + Math.random() * 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.globalAlpha = 1;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx2 = p.x - q.x;
          const dy2 = p.y - q.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < connectionDistance) {
            const alpha = (1 - dist2 / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = primary;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      animating = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (interactive && onMouse && onMouseLeave) {
        container?.removeEventListener("mousemove", onMouse);
        container?.removeEventListener("mouseleave", onMouseLeave);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, initParticles, getColors, connectionDistance, mouseInfluenceRadius, mouseRepelStrength, speed, interactive]);

  if (reducedMotion) return null;

  return (
    <div ref={containerRef} className={className} style={{ overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
      />
    </div>
  );
}
