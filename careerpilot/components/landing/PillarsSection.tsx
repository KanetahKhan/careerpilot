"use client";

import { useEffect, useRef } from "react";
import { Search, FileText, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";

const pillarRoutes: Record<string, string> = {
  "Job Hunter": "/jobs",
  "CV Brain": "/cv",
  "AI Coach": "/coach",
  "Tracker": "/tracker",
};

const pillars = [
  {
    icon: Search,
    title: "Job Hunter",
    description:
      "Natural language search with programmatic fit scores, skill gap analysis, and live job discovery.",
  },
  {
    icon: FileText,
    title: "CV Brain",
    description:
      "Your CV is the single source of truth. Every recommendation is grounded in your actual experience.",
  },
  {
    icon: Sparkles,
    title: "AI Coach",
    description:
      "Chat with a career coach that cites your CV sections. Readiness checks, roadmaps, and cover letters.",
  },
  {
    icon: BarChart3,
    title: "Tracker",
    description:
      "Kanban board, goals, deadlines, and a progress dashboard. Stay accountable to offer.",
  },
];

export function PillarsSection() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("card-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );

    cardsRef.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pillars-section">
      <div className="section-header">
        <h2 className="section-title">
          Four pillars.
          <br />
          <span className="section-accent">One platform.</span>
        </h2>
        <p className="section-subtitle">
          Everything you need to land your next role — powered by AI, grounded in your experience.
        </p>
      </div>

      <div className="pillars-grid">
        {pillars.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <Link
              key={pillar.title}
              href={pillarRoutes[pillar.title] || "#"}
              className="pillar-card-link"
            >
              <div
                ref={(el) => { cardsRef.current[i] = el; }}
                className="pillar-card"
                style={{ "--delay": `${i * 100}ms` } as React.CSSProperties}
              >
                <div className="pillar-icon">
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
