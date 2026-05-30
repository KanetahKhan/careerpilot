"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import {
  Upload, Edit3, Download, FileText, Printer, Sparkles,
  ExternalLink, Loader2, FileUp,
} from "lucide-react";
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

type ExtractedProfile = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: { title: string; company: string; duration?: string; description?: string }[];
  education?: { degree: string; institution: string; year?: string }[];
  projects?: { name: string; description?: string; technologies?: string[]; githubUrl?: string; liveUrl?: string }[];
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderCv, setBuilderCv] = useState<BuilderCv | null>(null);
  const [exportBusy, setExportBusy] = useState<"docx" | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

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

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setIsExtracting(true);
    setUploadErr(null);
    setExtracted(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/cv/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const extractForm = new FormData();
      extractForm.append("cv", file);
      const extractRes = await fetch("/api/cv/extract", { method: "POST", body: extractForm });
      const extractData = await extractRes.json();
      if (extractData.extracted) {
        setExtracted(extractData.extracted);
      }

      // Refresh profile data
      const [profileRes, buildRes] = await Promise.all([
        fetch("/api/cv/profile"),
        fetch("/api/cv/build", { cache: "no-store" }),
      ]);
      const profileJson = await profileRes.json();
      setProfile(profileJson);
      if (buildRes.ok) {
        const buildJson = await buildRes.json();
        if (buildJson && typeof buildJson === "object" && "fullName" in buildJson) {
          setBuilderCv(buildJson as BuilderCv);
        }
      }
    } catch (e: any) {
      setUploadErr(e.message);
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Pillar 2 · CV Profile"
        title="Exactly what the AI sees."
        subtitle="Your CV, parsed into section-tagged chunks and embedded in pgvector."
        icon={FileText}
        gradient="from-primary via-primary to-primary/70"
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

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {!loading && hasCv && profile && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div />
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><FileUp className="h-4 w-4" /> Re-upload CV</>
              )}
            </Button>
          </div>

          {uploadErr && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {uploadErr}
            </div>
          )}

          {extracted && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Extracted from CV</h3>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  AI Parsed
                </span>
              </div>

              {extracted.fullName && (
                <p className="text-sm text-muted-foreground">
                  Name: <span className="font-medium text-foreground">{extracted.fullName}</span>
                </p>
              )}

              {extracted.skills && extracted.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {extracted.skills.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {extracted.projects && extracted.projects.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Projects</h4>
                  {extracted.projects.map((proj, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-background p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">{proj.name}</p>
                      <p className="text-muted-foreground line-clamp-2">{proj.description}</p>
                      <div className="mt-2 flex gap-3">
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                            GitHub ↗
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Live Demo ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() =>
                  router.push(
                    `/profile/edit?prefill=${encodeURIComponent(JSON.stringify(extracted))}`,
                  )
                }
                className="w-full"
              >
                Populate Profile Form
              </Button>
            </div>
          )}

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
