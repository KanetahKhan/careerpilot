"use client";

import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">
          Land your dream job
          <br />
          <span className="hero-gradient">with AI precision</span>
        </h1>

        <p className="hero-subtitle">
          CareerPilot reads your CV, finds perfect-fit roles, coaches you through interviews,
          and tracks every application — all in one intelligent platform.
        </p>

        <div className="hero-cta-row">
          <Link href="/auth?mode=signup" className="hero-primary-btn">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <button className="hero-secondary-btn">
            <Play size={16} fill="currentColor" />
            Watch Demo
          </button>
        </div>
      </div>


    </section>
  );
}
