"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

function StaticPoster() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(167,139,250,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 70%, rgba(129,140,248,0.06) 0%, transparent 60%)",
        pointerEvents: "none",
      }}
    />
  );
}

const FlowFieldCanvas = dynamic(
  () => import("@/components/ui/flow-field-background"),
  { ssr: false, loading: () => <StaticPoster /> },
);

export default function GetStartedBackground() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (reduced) return <StaticPoster />;

  return (
    <FlowFieldCanvas
      particleCount={undefined}
      particleRadius={undefined}
      connectionDistance={130}
      mouseInfluenceRadius={200}
      mouseRepelStrength={5}
      speed={0.7}
      className="absolute inset-0"
    />
  );
}
