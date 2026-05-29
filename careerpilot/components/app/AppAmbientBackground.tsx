"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const FlowFieldCanvas = dynamic(
  () => import("@/components/ui/flow-field-background"),
  { ssr: false, loading: () => null },
);

export default function AppAmbientBackground() {
  const { resolvedTheme } = useTheme();
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!mounted || reduced) return null;
  // The flow field reads as a gray haze over the light Skybound theme, so it's
  // dark-mode only; light mode keeps the clean sky wash from body::before.
  if (resolvedTheme !== "dark") return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.2 }}
      aria-hidden="true"
    >
      <FlowFieldCanvas
        interactive={false}
        particleCount={undefined}
        speed={0.5}
        connectionDistance={140}
        className="absolute inset-0"
      />
    </div>
  );
}
