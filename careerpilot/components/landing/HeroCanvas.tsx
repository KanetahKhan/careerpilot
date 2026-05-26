"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";

/**
 * A calm particle field sized to the viewport, drifting slowly and reacting
 * very subtly to the pointer. Colors track --primary / --foreground so the
 * background follows whatever theme the user picks.
 */

type ThemeColors = { primary: THREE.Color; foreground: THREE.Color };

function readCssHsl(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  // Values look like "262 83% 58%" — wrap so THREE.Color accepts them.
  return `hsl(${raw.replace(/\s+/g, ", ")})`;
}

function readThemeColors(): ThemeColors {
  return {
    primary: new THREE.Color(readCssHsl("--primary", "hsl(262, 83%, 58%)")),
    foreground: new THREE.Color(readCssHsl("--foreground", "hsl(222, 47%, 11%)")),
  };
}

function ParticleField({ density }: { density: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const { theme, resolvedTheme } = useTheme();
  const activeTheme = resolvedTheme ?? theme ?? "dark";
  const { viewport } = useThree();

  // Sized to viewport so the field always fills the hero region. Z spread
  // gives a gentle parallax when the camera drifts.
  const { positions, count } = useMemo(() => {
    const c = density;
    const arr = new Float32Array(c * 3);
    const w = Math.max(8, viewport.width * 1.4);
    const h = Math.max(6, viewport.height * 1.4);
    for (let i = 0; i < c; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * w;
      arr[i * 3 + 1] = (Math.random() - 0.5) * h;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return { positions: arr, count: c };
  }, [density, viewport.width, viewport.height]);

  // Track colors as state so theme flips trigger a re-render of the material.
  const [colors, setColors] = useState<ThemeColors>(() => readThemeColors());
  useEffect(() => {
    setColors(readThemeColors());
  }, [activeTheme]);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    // Continuous, very slow drift.
    pts.rotation.z += delta * 0.015;
    pts.rotation.y += delta * 0.01;
    // Subtle pointer parallax (state.pointer is in NDC, ±1).
    const px = state.pointer.x;
    const py = state.pointer.y;
    pts.position.x += (px * 0.25 - pts.position.x) * 0.04;
    pts.position.y += (py * 0.18 - pts.position.y) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.045}
        sizeAttenuation
        color={colors.primary}
        transparent
        opacity={activeTheme === "dark" ? 0.7 : 0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Pauses RAF when the tab is hidden so the canvas doesn't burn cycles in a background tab. */
function VisibilityGate() {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [invalidate, gl]);
  return null;
}

export default function HeroCanvas() {
  // Smaller particle budget on phones; the field still looks dense thanks
  // to additive blending.
  const [density, setDensity] = useState(900);

  useEffect(() => {
    const apply = () => {
      const small = window.innerWidth < 768;
      setDensity(small ? 480 : 900);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // Pause the loop while the tab is hidden — saves CPU/GPU on background tabs.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    const onVis = () =>
      setFrameloop(document.visibilityState === "visible" ? "always" : "never");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 60 }}
      frameloop={frameloop}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <VisibilityGate />
      <ParticleField density={density} />
    </Canvas>
  );
}
