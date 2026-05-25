"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search, FileText, Sparkles, Kanban,
  ArrowRight, Upload, TrendingUp, Target
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { FadeIn } from "@/components/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/StaggerContainer";

export default function LandingPage() {
  const [hasCV, setHasCV] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/cv/profile")
      .then(r => r.json())
      .then(data => setHasCV(!!data.document || (data.totalChunks ?? 0) > 0))
      .catch(() => setHasCV(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 text-center">
          <FadeIn delay={0}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Stop applying blindly.
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CareerPilot reads your CV, scores job fit with real math, and tracks every application.
              No generic advice. No hallucinated experience. Just your career, understood.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {hasCV === true ? (
                <>
                  <Link
                    href="/hunter"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Open Dashboard <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center gap-2 border border-border bg-card text-foreground hover:bg-secondary px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    View My CV
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Upload size={16} /> Upload Your CV
                  </Link>
                  <Link
                    href="/hunter"
                    className="inline-flex items-center justify-center gap-2 border border-border bg-card text-foreground hover:bg-secondary px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Try Demo Search
                  </Link>
                </>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center" staggerDelay={0.15}>
            <StaggerItem>
              <div className="flex flex-col items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">RAG-Grounded</h3>
                <p className="text-sm text-muted-foreground">Every answer cites your actual CV sections</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Programmatic Scoring</h3>
                <p className="text-sm text-muted-foreground">Fit scores computed with cosine + Jaccard, not guessed</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Agentic AI</h3>
                <p className="text-sm text-muted-foreground">Searches live jobs, drafts cover letters, builds roadmaps</p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            How it works
          </h2>
          <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.2}>
            <StaggerItem>
              <div className="relative flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
                <h3 className="text-lg font-semibold text-foreground">Upload your CV</h3>
                <p className="text-muted-foreground leading-relaxed">
                  PDF or DOCX. We chunk it by section — Experience, Education, Skills, Projects — and embed it for semantic search.
                </p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="relative flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
                <h3 className="text-lg font-semibold text-foreground">Find your matches</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Type in plain English: &ldquo;Remote React internships in Dhaka.&rdquo; Our agent hunts jobs and scores fit against your real experience.
                </p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="relative flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
                <h3 className="text-lg font-semibold text-foreground">Track & win</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Drag applications through your pipeline. Get AI roadmaps and cover letters grounded in your CV — never generic filler.
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* 4 PILLARS GRID */}
      <section className="py-20 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Four pillars. One platform.
          </h2>
          <StaggerContainer className="grid md:grid-cols-2 gap-6" staggerDelay={0.15}>
            <StaggerItem>
              <Link href="/hunter" className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Job Hunter</h3>
                </div>
                <p className="text-muted-foreground">
                  Natural language search with programmatic fit scores, skill gap analysis, and live job discovery.
                </p>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/profile" className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">CV Brain</h3>
                </div>
                <p className="text-muted-foreground">
                  Your CV is the single source of truth. Every recommendation is grounded in your actual experience.
                </p>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/assistant" className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">AI Coach</h3>
                </div>
                <p className="text-muted-foreground">
                  Chat with a career coach that cites your CV sections. Readiness checks, roadmaps, and cover letters — no hallucinations.
                </p>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/tracker" className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Kanban className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Tracker</h3>
                </div>
                <p className="text-muted-foreground">
                  Kanban board, goals, deadlines, and a progress dashboard. Stay accountable from first application to offer.
                </p>
              </Link>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* DEMO CTA STRIP */}
      <FadeIn direction="none">
        <section className="py-16 bg-primary/5 border-y border-primary/10">
          <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
            <p className="text-muted-foreground mb-4">Built in 14 days for CodeSprint 2026</p>
            <Link
              href="/hunter"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              View the live demo <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </FadeIn>

      {/* FOOTER */}
      <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>CareerPilot — Your Agentic Career Co-pilot</p>
      </footer>
    </div>
  );
}
