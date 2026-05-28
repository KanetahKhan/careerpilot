"use client";

import { ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Hero3DBackground } from "./Hero3DBackground";
import { TypeWriter } from "./TypeWriter";
import { useAuth } from "@/components/AuthProvider";

const TYPED_PHRASES = [
  "perfect-fit roles.",
  "missing skills.",
  "tailored cover letters.",
  "interview prep.",
  "your weekly roadmap.",
];

export function HeroSection() {
  const { user, loading } = useAuth();

  const cta =
    loading
      ? { href: "", label: "", skeleton: true }
      : user
        ? { href: "/hunter", label: "Go to Dashboard", skeleton: false }
        : { href: "/auth?mode=signup", label: "Get Started Free", skeleton: false };

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
          {cta.skeleton ? (
            <div className="hero-cta-skeleton" />
          ) : (
            <Link href={cta.href} className="hero-primary-btn">
              {cta.label}
              {user ? <LayoutDashboard size={18} /> : <ArrowRight size={18} />}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
