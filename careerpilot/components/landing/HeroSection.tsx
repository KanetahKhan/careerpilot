"use client";

import Link from "next/link";
import { Star, Briefcase } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

// Deterministic so server and client render identically (no hydration mismatch).
const PARTICLES = [
  { left: "6%", top: "22%", dur: "26s", delay: "0s" },
  { left: "14%", top: "68%", dur: "32s", delay: "3s" },
  { left: "24%", top: "12%", dur: "28s", delay: "1s" },
  { left: "33%", top: "80%", dur: "34s", delay: "5s" },
  { left: "44%", top: "30%", dur: "24s", delay: "2s" },
  { left: "57%", top: "74%", dur: "30s", delay: "4s" },
  { left: "66%", top: "18%", dur: "27s", delay: "1.5s" },
  { left: "74%", top: "60%", dur: "33s", delay: "2.5s" },
  { left: "83%", top: "34%", dur: "29s", delay: "0.5s" },
  { left: "90%", top: "72%", dur: "31s", delay: "3.5s" },
  { left: "48%", top: "8%", dur: "25s", delay: "4.5s" },
  { left: "18%", top: "44%", dur: "35s", delay: "2s" },
];

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="sky-hero">
      <div className="sky-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sky-particle"
            style={{ left: p.left, top: p.top, animationDuration: p.dur, animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="sky-hero-inner">
        <div className="sky-hero-copy">
          <span className="sky-badge">AI-Powered Career Navigator</span>
          <h1 className="sky-hero-title">
            Land your dream job
            <br />
            <span className="accent">with sky-high precision</span>
          </h1>
          <p className="sky-hero-sub">
            CareerPilot reads your CV and finds opportunities grounded in your real
            experience — never invented, always intentional.
          </p>
          <Link href={user ? "/hunter" : "/auth?mode=signup"} className="sky-btn sky-btn--lg">
            {user ? "Go to Dashboard" : "Start Exploring"}
          </Link>
        </div>

        <div className="sky-hero-art">
          <div className="sky-hero-blob" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-mascot.png" alt="CareerPilot mascot" className="sky-hero-img" />
          <span className="sky-float-chip sky-float-chip--star" aria-hidden="true">
            <Star size={20} fill="currentColor" />
          </span>
          <span className="sky-float-chip sky-float-chip--work" aria-hidden="true">
            <Briefcase size={20} />
          </span>
        </div>
      </div>
    </section>
  );
}
