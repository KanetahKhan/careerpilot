"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Hero3DBackground } from "./Hero3DBackground";
import { TypeWriter } from "./TypeWriter";

const TYPED_PHRASES = [
  "perfect-fit roles.",
  "missing skills.",
  "tailored cover letters.",
  "interview prep.",
  "your weekly roadmap.",
];

export function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-bg-wrap">
        <Hero3DBackground />
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          Land your dream job
          <br />
          <span className="hero-gradient">with AI precision</span>
        </h1>

        <p className="hero-subtitle">
          CareerPilot reads your CV and finds{" "}
          <span className="hero-typed">
            <TypeWriter strings={TYPED_PHRASES} />
          </span>
          <br />
          All grounded in your real experience — never invented.
        </p>

        <div className="hero-cta-row">
          <Link href="/auth?mode=signup" className="hero-primary-btn">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
