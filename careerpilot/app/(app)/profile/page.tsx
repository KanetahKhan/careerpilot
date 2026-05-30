"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { Upload, Edit3, Download, FileText, Printer, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CvStructuredView } from "@/components/cv/CvStructuredView";
import { PortfolioPanel } from "@/components/portfolio/PortfolioPanel";
import { downloadCvDocx, printCv } from "@/lib/export/client";
import type { BuilderCv } from "@/lib/cv-transform";

type ProfileSection = { section: string; chunks: { position: number; content: string }[] };
type CvProfile = {
  document: { fileName: string; createdAt: string } | null;
  sections: ProfileSection[];
  totalChunks: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderCv, setBuilderCv] = useState<BuilderCv | null>(null);
  const [exportBusy, setExportBusy] = useState<"docx" | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profileRes, buildRes] = await Promise.all([
        fetch("/api/cv/profile"),
        fetch("/api/cv/build", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      const profileJson = await profileRes.json();
      setProfile(profileJson);
      if (buildRes.ok) {
        const buildJson = await buildRes.json();
        if (buildJson && typeof buildJson === "object" && "fullName" in buildJson) {
          setBuilderCv(buildJson as BuilderCv);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
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
      <PageHeader
        eyebrow="Pillar 2 · CV Profile"
        title="Exactly what the AI sees."
        subtitle="Your CV, parsed into section-tagged chunks and embedded in pgvector."
        icon={FileText}
        gradient="from-indigo-500 via-indigo-500 to-blue-500"
      />

      {loading && (
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading your CV profile…</p>
        </div>
      )}

      {!loading && !hasCv && (
        <div className="panel p-8 text-center space-y-4">
          <p className="text-muted-foreground">No CV indexed yet.</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a file or build your CV in-app — either way it goes through the same
            chunking and embedding pipeline.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/profile/edit">
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
          <PortfolioPanel hasCv />

          <CvStructuredView
            sections={profile.sections}
            totalChunks={profile.totalChunks}
            profile={{
              fullName: builderCv?.fullName,
              jobTitle: builderCv?.headline,
              email: builderCv?.email,
            }}
            onExportDocx={onDocx}
            canExport={canExport}
            exportBusy={exportBusy === "docx"}
          />

          {exportErr && <p className="text-xs text-destructive">{exportErr}</p>}
        </>
      )}
    </div>
    </FadeIn>
  );
}
