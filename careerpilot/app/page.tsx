"use client";
import Link from "next/link";
import { CvUploader } from "@/components/CvUploader";

const pillars = [
  { n: "01", title: "Job Hunter Agent", desc: "Natural-language search → live jobs → ranked cards with a computed fit score.", href: "/hunter", color: "text-amber" },
  { n: "02", title: "Resume Intelligence", desc: "Your CV, chunked by section, embedded, and stored in pgvector. The single source of truth.", href: "/", color: "text-mint" },
  { n: "03", title: "AI Assistant", desc: "Chat grounded strictly in your CV. Roadmaps, gap analysis, cover letters — never hallucinated.", href: "/assistant", color: "text-sky" },
  { n: "04", title: "Progress Tracker", desc: "Kanban application board, goals, and a live dashboard. Accountability that sticks.", href: "/tracker", color: "text-signal" },
];

export default function Home() {
  return (
    <div className="space-y-10 py-4">
      {/* hero */}
      <section className="animate-fade-up">
        <p className="label mb-3">Agentic · CV-grounded · CodeSprint 2026</p>
        <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight">
          The career co-pilot that{" "}
          <span className="text-signal">actually knows you.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-chalk-dim">
          Upload your CV once. Every job match, fit score, and cover letter is grounded in
          your real experience — not a generic AI guess.
        </p>
      </section>

      {/* upload + pillar map */}
      <section className="grid gap-5 md:grid-cols-2">
        <CvUploader />
        <div className="grid grid-cols-2 gap-3">
          {pillars.map((p) => (
            <Link
              key={p.n}
              href={p.href}
              className="panel group flex flex-col justify-between p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className={`font-mono text-sm ${p.color}`}>{p.n}</span>
              <div className="mt-6">
                <p className="font-display font-bold">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-chalk-faint">{p.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-chalk-dim">
          Start by uploading a CV, then{" "}
          <Link href="/hunter" className="text-signal underline-offset-4 hover:underline">
            hunt jobs
          </Link>{" "}
          or{" "}
          <Link href="/assistant" className="text-signal underline-offset-4 hover:underline">
            ask the assistant
          </Link>
          .
        </p>
        <span className="chip bg-ink-700 text-chalk-dim font-mono">$0 infra · Gemini · Supabase · Vercel</span>
      </section>
    </div>
  );
}
