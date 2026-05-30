"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import {
  Upload,
  Edit3,
  FileText,
  Printer,
  Sparkles,
  Flame,
  Eye,
  Star,
  ArrowRight,
  PlaneTakeoff,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCvDocx, printCv } from "@/lib/export/client";
import type { BuilderCv } from "@/lib/cv-transform";
import { PortfolioPanel } from "@/components/portfolio/PortfolioPanel";

type ProfileSection = { section: string; chunks: { position: number; content: string }[] };
type CvProfile = {
  document: { fileName: string; createdAt: string } | null;
  sections: ProfileSection[];
  totalChunks: number;
};

const KEY_SECTIONS = ["summary", "experience", "education", "skills", "projects"];

const SECTION_COLOR: Record<string, string> = {
  experience: "text-primary",
  education: "text-sky-500",
  projects: "text-emerald-500",
  skills: "text-amber-500",
  summary: "text-foreground",
  certifications: "text-emerald-500",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderCv, setBuilderCv] = useState<BuilderCv | null>(null);
  const [exportBusy, setExportBusy] = useState<"docx" | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cv/profile")
      .then((r) => r.json())
      .then((j) => setProfile(j))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/cv/build", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j === "object" && "fullName" in j) setBuilderCv(j as BuilderCv);
      })
      .catch(() => {});
  }, []);

  const hasCv = Boolean(profile?.totalChunks && profile.totalChunks > 0);
  const canExport = Boolean(builderCv);

  const present = profile
    ? KEY_SECTIONS.filter((k) => profile.sections.some((s) => s.section === k)).length
    : 0;
  const completeness = Math.round((present / KEY_SECTIONS.length) * 100);
  const experience = builderCv?.experience ?? [];
  const skills = builderCv?.skills ?? [];

  function nameSlug() {
    const n = builderCv?.fullName?.trim();
    if (!n) return "my";
    return n.replace(/\s+/g, "-").toLowerCase();
  }

  async function onDocx() {
    if (!builderCv) return;
    setExportBusy("docx");
    setExportErr(null);
    try {
      await downloadCvDocx(builderCv, { filename: `${nameSlug()}-cv.docx` });
    } catch (e: any) {
      setExportErr(e.message);
    } finally {
      setExportBusy(null);
    }
  }

  function onPdf() {
    if (!builderCv) return;
    printCv(builderCv);
  }

  return (
    <FadeIn>
      <div className="space-y-6 py-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
              CV Brain
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              The single source of truth for your professional story.
            </p>
          </div>
          <PlaneTakeoff size={52} strokeWidth={1.5} className="hidden shrink-0 text-primary/20 md:block" />
        </header>

        {loading && (
          <p className="animate-pulse-glow text-sm text-primary">Loading your CV profile…</p>
        )}

        {/* No CV yet */}
        {!loading && !hasCv && (
          <div className="glass-card rounded-3xl p-10 text-center">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
              <UploadCloud size={32} />
            </span>
            <h3 className="font-display text-xl font-bold text-foreground">No CV indexed yet.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Upload a file or build your CV in-app — either way it goes through the same chunking
              and embedding pipeline.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link href="/onboarding"><Button variant="primary"><Upload className="h-4 w-4" /> Upload your CV</Button></Link>
              <Link href="/profile/edit"><Button variant="outline"><Edit3 className="h-4 w-4" /> Build one here</Button></Link>
            </div>
          </div>
        )}

        {/* Bento */}
        {!loading && hasCv && profile && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* CV completeness (real) */}
            <section className="glass-card flex flex-col justify-between rounded-3xl p-8 md:col-span-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">CV completeness</h3>
                  <p className="mt-1 text-muted-foreground">
                    {present} of {KEY_SECTIONS.length} key sections indexed and embedded for retrieval.
                  </p>
                </div>
                <span className="font-display text-5xl font-black tracking-tighter text-primary">
                  {completeness}%
                </span>
              </div>
              <div className="mb-8 h-9 w-full overflow-hidden rounded-full bg-sky-100 p-1.5">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all"
                  style={{ width: `${Math.max(completeness, 6)}%` }}
                >
                  <Star size={16} fill="currentColor" className="absolute -right-1 top-1/2 -translate-y-1/2 text-white" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/profile/edit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <Edit3 size={18} /> Edit CV
                </Link>
                {canExport && (
                  <>
                    <button
                      onClick={onPdf}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-6 py-3.5 font-display font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      <Printer size={18} /> Preview PDF
                    </button>
                    <button
                      onClick={onDocx}
                      disabled={exportBusy !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-5 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                    >
                      <FileText size={16} /> {exportBusy === "docx" ? "Building…" : "Word"}
                    </button>
                  </>
                )}
              </div>
              {exportErr && <p className="mt-2 text-xs text-rose-500">{exportErr}</p>}
            </section>

            {/* AI Coach CTA (real feature) */}
            <aside className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-sky-100/40 p-6 backdrop-blur-md md:col-span-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white">
                  <Sparkles size={20} />
                </span>
                <h4 className="font-display text-lg font-bold text-primary">AI Coach</h4>
              </div>
              <p className="rounded-3xl border border-primary/10 bg-white/70 p-5 text-sm leading-relaxed text-muted-foreground">
                Your coach is grounded in this exact CV. Ask it to spot skill gaps, draft a cover
                letter, or plan a roadmap — every answer cites your real sections.
              </p>
              <Link
                href="/assistant"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-95"
              >
                Open AI Coach <ArrowRight size={16} />
              </Link>
            </aside>

            {/* Update CV (dashed) */}
            <Link
              href="/onboarding"
              className="group flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-primary/25 bg-white/70 p-10 text-center transition-all hover:border-primary hover:bg-white md:col-span-5"
            >
              <span className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <UploadCloud size={40} />
              </span>
              <h4 className="font-display text-xl font-bold text-primary">Reach new heights</h4>
              <p className="mt-2 text-muted-foreground">
                Drop a new resume to re-index — same chunking & embedding pipeline.
              </p>
              <div className="mt-5 flex gap-2">
                {["PDF", "DOCX", "TXT"].map((t) => (
                  <span key={t} className="rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-secondary-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </Link>

            {/* Extracted skills (real) */}
            <section className="glass-card rounded-3xl p-8 md:col-span-7">
              <h4 className="mb-6 flex items-center gap-3 font-display text-xl font-bold text-foreground">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-100 text-orange-500">
                  <Flame size={22} />
                </span>
                Extracted skills
              </h4>
              {skills.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-primary/10 bg-primary/10 px-5 py-2.5 font-semibold text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 p-4">
                    <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      {skills.length} skills indexed from your CV
                    </span>
                    <Link href="/profile/edit" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                      Edit <ArrowRight size={14} />
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No distinct skills section detected.{" "}
                  <Link href="/profile/edit" className="font-semibold text-primary hover:underline">Add skills in the editor →</Link>
                </p>
              )}
            </section>

            {/* Portfolio + indexed document (real) */}
            <div className="grid grid-cols-1 gap-4 md:col-span-12 md:grid-cols-2">
              <PortfolioPanel hasCv />
              <div className="rounded-3xl border border-primary/15 bg-primary/5 p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Indexed document
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-primary">
                      <FileText size={20} />
                      {profile.document?.fileName ?? "Built CV"}
                    </p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="font-display text-3xl font-black text-primary">{profile.totalChunks}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chunks</div>
                    </div>
                    <div>
                      <div className="font-display text-3xl font-black text-primary">{profile.sections.length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Career journey (real experience) */}
            {experience.length > 0 && (
              <section className="glass-card rounded-3xl p-8 md:col-span-12">
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-2xl font-bold text-foreground">Career Journey</h4>
                    <div className="mt-2 h-1.5 w-24 rounded-full bg-primary" />
                  </div>
                  <PlaneTakeoff size={48} className="text-primary/30" />
                </div>
                <div className="relative ml-4 space-y-10 border-l-4 border-sky-200/70 pl-10">
                  {experience.map((e, i) => {
                    const period = e.start ? `${e.start} — ${e.end || "Present"}` : e.end || "";
                    return (
                      <div key={i} className="relative">
                        <div className="absolute -left-[54px] top-0 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-primary shadow-lg">
                          <Star size={14} fill="currentColor" className="text-white" />
                        </div>
                        <div className="rounded-3xl border border-l-8 border-white/80 border-l-primary bg-white p-6 shadow-[0_15px_30px_-12px_rgba(125,211,252,0.18)] transition-transform hover:-translate-y-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h5 className="font-display text-xl font-bold text-primary">{e.title}</h5>
                            {period && (
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {period}
                              </span>
                            )}
                          </div>
                          {e.company && <p className="mt-1 font-semibold text-foreground">{e.company}</p>}
                          {e.bullets?.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                              {e.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Exactly what the AI sees (real chunks) */}
            <section className="glass-card rounded-3xl p-8 md:col-span-12">
              <div className="mb-6 flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
                  <Eye size={24} />
                </span>
                <div>
                  <h4 className="font-display text-xl font-bold text-foreground">Exactly what the AI sees</h4>
                  <p className="text-sm text-muted-foreground">
                    Your CV, parsed into section-tagged chunks and embedded in pgvector.
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                {profile.sections.map((s) => (
                  <div key={s.section} className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Cited from:{" "}
                      <span className={`${SECTION_COLOR[s.section] ?? "text-foreground"}`}>{s.section}</span>{" "}
                      · {s.chunks.length} chunk{s.chunks.length === 1 ? "" : "s"}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {s.chunks.map((c) => (
                        <div key={c.position} className="rounded-2xl border border-primary/10 bg-white/60 p-4">
                          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-tighter text-primary">
                            {s.section} → #{c.position}
                          </p>
                          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                            {c.content.length > 600 ? `${c.content.slice(0, 600)}…` : c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
