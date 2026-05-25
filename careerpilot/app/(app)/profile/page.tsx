"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

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

  useEffect(() => {
    fetch("/api/cv/profile")
      .then((r) => r.json())
      .then((j) => setProfile(j))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const hasCv = profile?.document && profile.totalChunks > 0;

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Pillar 2 · CV Profile</p>
        <h1 className="font-display text-3xl font-bold">Exactly what the AI sees.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Your CV, parsed into section-tagged chunks and embedded in pgvector. Every
          answer and fit score is retrieved from <span className="text-primary">these</span> chunks —
          this is the grounding made visible.
        </p>
      </div>

      {loading && <p className="text-sm text-amber-400 animate-pulse-glow">Loading your CV profile…</p>}

      {!loading && !hasCv && (
        <div className="panel p-6 text-center">
          <p className="text-muted-foreground">No CV indexed yet.</p>
          <Link href="/onboarding" className="btn-primary mt-4 inline-flex">
            Upload your CV →
          </Link>
        </div>
      )}

      {!loading && hasCv && profile && (
        <>
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="label">indexed document</p>
              <p className="font-mono text-sm text-foreground">{profile.document!.fileName}</p>
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
