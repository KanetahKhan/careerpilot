"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { Upload, Edit3, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCvDocx, printCv } from "@/lib/export/client";
import type { BuilderCv } from "@/lib/cv-transform";

type ProfileSection = { section: string; chunks: { position: number; content: string }[] };
type CvProfile = {
  document: { fileName: string; createdAt: string } | null;
  sections: ProfileSection[];
  totalChunks: number;
};

const SECTION_COLOR: Record<string, string> = {
  experience: "text-primary",
  education: "text-sky-400",
  projects: "text-emerald-400",
  skills: "text-amber-400",
  summary: "text-foreground",
  certifications: "text-emerald-400",
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

  const hasCv = profile?.totalChunks && profile.totalChunks > 0;
  const canExport = Boolean(builderCv);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label mb-2">Pillar 2 · CV Profile</p>
          <h1 className="font-display text-3xl font-bold">Exactly what the AI sees.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your CV, parsed into section-tagged chunks and embedded in pgvector. Every
            answer and fit score is retrieved from <span className="text-primary">these</span> chunks —
            this is the grounding made visible.
          </p>
        </div>
        {hasCv && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Link href="/profile/edit">
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4" /> Edit CV
                </Button>
              </Link>
            </div>
            {canExport && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  Download:
                </span>
                <button
                  type="button"
                  onClick={onDocx}
                  disabled={exportBusy !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
                >
                  <FileText className="h-3 w-3" />
                  {exportBusy === "docx" ? "Building…" : "Word (.docx)"}
                </button>
                <button
                  type="button"
                  onClick={onPdf}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:border-primary/50 transition-colors"
                >
                  <Printer className="h-3 w-3" />
                  PDF
                </button>
              </div>
            )}
            {exportErr && <p className="text-xs text-destructive">{exportErr}</p>}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-amber-400 animate-pulse-glow">Loading your CV profile…</p>}

      {!loading && !hasCv && (
        <div className="panel p-8 text-center space-y-4">
          <p className="text-muted-foreground">No CV indexed yet.</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a file or build your CV in-app — either way it goes through the same
            chunking and embedding pipeline.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/onboarding">
              <Button variant="primary">
                <Upload className="h-4 w-4" /> Upload your CV
              </Button>
            </Link>
            <Link href="/profile/edit">
              <Button variant="outline">
                <Edit3 className="h-4 w-4" /> Build one here
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!loading && hasCv && profile && (
        <>
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="label">indexed document</p>
              <p className="font-mono text-sm text-foreground">{profile.document?.fileName ?? "Built CV"}</p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="font-display text-2xl font-bold text-primary">{profile.totalChunks}</p>
                <p className="label">chunks</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-emerald-400">{profile.sections.length}</p>
                <p className="label">sections</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {profile.sections.map((s) => (
              <div key={s.section} className="space-y-2">
                <p className="label">
                  Cited from:{" "}
                  <span className={`font-semibold ${SECTION_COLOR[s.section] ?? "text-foreground"}`}>
                    {s.section}
                  </span>{" "}
                  · {s.chunks.length} chunk{s.chunks.length === 1 ? "" : "s"}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {s.chunks.map((c) => (
                    <div key={c.position} className="panel animate-fade-up p-4">
                      <p className="label mb-2">
                        {s.section} → #{c.position}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {c.content.length > 600 ? `${c.content.slice(0, 600)}…` : c.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </FadeIn>
  );
}
