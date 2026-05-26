"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * The instant-paint stand-in for the 3D canvas. Same color story
 * (--primary / --accent over --background) so the swap from poster to
 * canvas is barely noticeable. Pure CSS, zero JS cost.
 */
function StaticPoster() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background:
          "radial-gradient(60% 50% at 50% 35%, hsl(var(--primary) / 0.18), transparent 70%), radial-gradient(50% 50% at 80% 70%, hsl(var(--accent) / 0.12), transparent 70%), radial-gradient(55% 55% at 15% 80%, hsl(var(--primary) / 0.10), transparent 70%)",
      }}
    />
  );
}

// Lazy-loaded so three.js never runs during SSR and never blocks first paint.
// While the chunk is downloading and hydrating, the poster fills the same box.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <StaticPoster />,
});

export function Hero3DBackground() {
  // If the user prefers reduced motion, we never load three.js at all —
  // the poster alone is the entire hero background.
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Always render the poster — it shows during hydration, behind the
          canvas once it mounts, and on its own when motion is reduced. */}
      <StaticPoster />
      {reduced === false && <HeroCanvas />}
    </div>
  );
}
