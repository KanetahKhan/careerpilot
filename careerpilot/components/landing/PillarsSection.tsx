import Link from "next/link";
import { Compass, Brain, Bot, Kanban } from "lucide-react";

const PILLARS = [
  {
    icon: Compass,
    title: "Job Hunter",
    href: "/hunter",
    variant: "a",
    desc: "Natural language search with programmatic fit scores, skill gap analysis, and live job discovery.",
  },
  {
    icon: Brain,
    title: "CV Brain",
    href: "/profile",
    variant: "b",
    desc: "Your CV is the single source of truth. Every recommendation is grounded in your actual experience.",
  },
  {
    icon: Bot,
    title: "AI Coach",
    href: "/assistant",
    variant: "c",
    desc: "Chat with a career coach that cites your CV sections. Readiness checks, roadmaps, and cover letters.",
  },
];

export function PillarsSection() {
  return (
    <section className="sky-section sky-section-narrow" id="pillars">
      <div className="sky-section-head">
        <h2 className="sky-section-title">Four pillars. One platform.</h2>
        <p className="sky-section-sub">
          Everything you need to land your next role — powered by AI, grounded in your experience.
        </p>
      </div>

      <div className="sky-pillars">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.title} href={p.href} className={`sky-pillar sky-pillar--${p.variant}`}>
              <span className="sky-pillar-icon">
                <Icon size={28} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </Link>
          );
        })}

        <Link href="/tracker" className="sky-pillar sky-pillar--d sky-pillar--wide">
          <div>
            <span className="sky-pillar-icon">
              <Kanban size={28} />
            </span>
            <h3>Tracker</h3>
            <p>
              Kanban board, goals, deadlines, and a progress dashboard. Stay accountable until
              that offer letter arrives.
            </p>
          </div>
          <div className="sky-pillar-kanban" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="sky-kanban-card">
                <div className="sky-kanban-bar" />
                <div className="sky-kanban-bar short" />
              </div>
            ))}
          </div>
        </Link>
      </div>
    </section>
  );
}
