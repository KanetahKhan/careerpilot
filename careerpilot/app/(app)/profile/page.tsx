"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import {
  Upload, Edit3, Download, FileText, Printer, Sparkles,
  ExternalLink, Loader2, FileUp, CheckCircle2, X, UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CvStructuredView } from "@/components/cv/CvStructuredView";
import { PortfolioPanel } from "@/components/portfolio/PortfolioPanel";
import { downloadCvDocx, printCv } from "@/lib/export/client";
import type { BuilderCv } from "@/lib/cv-transform";
import { getErrorMessage } from "@/lib/errors";

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

type UploadStep = "select" | "uploading" | "parsing" | "extracting" | "done" | "error";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderCv, setBuilderCv] = useState<BuilderCv | null>(null);
  const [exportBusy, setExportBusy] = useState<"docx" | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Upload portal state
  const [showUploadPortal, setShowUploadPortal] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("select");
  const [uploadFileName, setUploadFileName] = useState("");
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);

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

  const hasCv = Boolean(profile?.totalChunks && profile.totalChunks > 0);
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
    } catch (e: unknown) {
      setExportErr(getErrorMessage(e));
    } finally {
      setExportBusy(null);
    }
  }

  function onPdf() {
    if (!builderCv) return;
    printCv(builderCv);
  }

  async function handleFileUpload(file: File) {
    setUploadFileName(file.name);
    setUploadStep("uploading");
    setUploadErr(null);
    setExtracted(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadStep("uploading");
      const uploadRes = await fetch("/api/cv/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const uploadData = await uploadRes.json();

      setUploadStep("extracting");
      const extractRes = await fetch("/api/cv/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.rawText ?? "" }),
      });
      let extractedData: ExtractedProfile | null = null;
      if (extractRes.ok) {
        const data = await extractRes.json();
        if (data.extracted) {
          extractedData = data.extracted as ExtractedProfile;
          setExtracted(extractedData);
        }
      }

      if (extractedData) {
        const builderPayload: BuilderCv = {
          fullName: extractedData.fullName ?? "",
          headline: "",
          email: extractedData.email ?? "",
          phone: extractedData.phone ?? "",
          location: extractedData.location ?? "",
          summary: extractedData.summary ?? "",
          skills: extractedData.skills ?? [],
          experience: (extractedData.experience ?? []).map((e) => ({
            title: e.title,
            company: e.company,
            start: e.duration ?? "",
            end: "",
            bullets: e.description ? [e.description] : [],
          })),
          education: (extractedData.education ?? []).map((e) => ({
            degree: e.degree,
            institution: e.institution,
            start: e.year ?? "",
            end: "",
            details: "",
          })),
          projects: (extractedData.projects ?? []).map((p) => ({
            name: p.name,
            description: p.description ?? "",
            tech: p.technologies ?? [],
            githubUrl: p.githubUrl ?? "",
            liveUrl: p.liveUrl ?? "",
          })),
          certifications: [],
          extracurricular: [],
        };
        await fetch("/api/cv/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(builderPayload),
        }).catch(() => {});
      }

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

      setUploadStep("done");
    } catch (e: unknown) {
      setUploadErr(getErrorMessage(e));
      setUploadStep("error");
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  function openUploadPortal() {
    setShowUploadPortal(true);
    setUploadStep("select");
    setUploadFileName("");
    setExtracted(null);
    setUploadErr(null);
  }

  function closeUploadPortal() {
    setShowUploadPortal(false);
    router.refresh();
  }

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="CV Profile"
        title="Your CV, your way."
        subtitle="Upload a file or build in-app — same chunking and embedding pipeline either way."
        icon={FileText}
        gradient="from-primary via-primary to-primary/70"
      />

      {loading && (
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading your CV profile...</p>
        </div>
      )}

      {!loading && !hasCv && (
        <div className="panel p-8 text-center space-y-4">
          <p className="text-muted-foreground">No CV yet.</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a file or build your CV in-app.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="primary" onClick={openUploadPortal}>
              <Upload className="h-4 w-4" /> Upload your CV
            </Button>
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

      {uploadErr && !showUploadPortal && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {uploadErr}
        </div>
      )}

      {!loading && hasCv && profile && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div />
            <Button variant="outline" size="sm" onClick={openUploadPortal}>
              <FileUp className="h-4 w-4" /> Re-upload CV
            </Button>
          </div>

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

      {/* Upload Portal Modal */}
      {showUploadPortal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeUploadPortal}
        >
          <div
            className="panel my-8 w-full max-w-lg animate-fade-up p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Upload your CV</h2>
              <button onClick={closeUploadPortal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="mb-6 flex items-center gap-1 text-xs font-medium">
              {["select", "uploading", "extracting", "done"].map((step, idx) => {
                const stepOrder = ["select", "uploading", "extracting", "done"];
                const currentIdx = stepOrder.indexOf(uploadStep === "error" ? "select" : uploadStep === "parsing" ? "uploading" : uploadStep);
                const isActive = stepOrder.indexOf(step) === currentIdx;
                const isPast = stepOrder.indexOf(step) < currentIdx;
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        isPast
                          ? "bg-primary text-primary-foreground"
                          : isActive
                          ? "bg-primary/20 text-primary ring-2 ring-primary/40"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPast ? "✓" : idx + 1}
                    </span>
                    <span className={`hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step === "select" ? "File" : step === "uploading" ? "Upload" : step === "extracting" ? "Extract" : "Done"}
                    </span>
                    {idx < 3 && <div className={`h-px flex-1 ${isPast ? "bg-primary" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>

            {uploadStep === "select" && (
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-background/40 px-6 py-12 text-center transition-colors hover:border-primary/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                onClick={() => uploadInputRef.current?.click()}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drop your CV here or click to browse</p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, or TXT</p>
                </div>
              </div>
            )}

            {uploadStep === "uploading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium text-foreground">Uploading...</p>
                <p className="text-sm text-muted-foreground">{uploadFileName}</p>
              </div>
            )}

            {uploadStep === "parsing" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium text-foreground">Parsing text...</p>
                <p className="text-sm text-muted-foreground">Extracting content from your file</p>
              </div>
            )}

            {uploadStep === "extracting" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium text-foreground">AI is analyzing your CV...</p>
                <p className="text-sm text-muted-foreground">Structuring skills, experience, and education</p>
              </div>
            )}

            {uploadStep === "done" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Your CV is ready!</p>
                    <p className="text-sm text-muted-foreground">{uploadFileName} has been uploaded, parsed, and saved.</p>
                  </div>
                </div>

                {extracted && (
                  <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                    <p className="font-semibold text-foreground">What we found</p>
                    {extracted.fullName && (
                      <p className="text-sm text-muted-foreground">Name: <span className="font-medium text-foreground">{extracted.fullName}</span></p>
                    )}
                    {extracted.skills && extracted.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {extracted.skills.slice(0, 8).map((s, i) => (
                          <span key={i} className="chip bg-primary/10 text-primary text-xs">{s}</span>
                        ))}
                        {extracted.skills.length > 8 && (
                          <span className="chip bg-muted text-muted-foreground text-xs">+{extracted.skills.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Link href="/profile" className="flex-1">
                    <Button variant="primary" className="w-full" onClick={closeUploadPortal}>
                      Done
                    </Button>
                  </Link>
                  <Link href="/profile/edit">
                    <Button variant="outline">
                      <Edit3 className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {uploadStep === "error" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="font-medium text-destructive">Upload failed</p>
                  <p className="mt-1 text-sm text-muted-foreground">{uploadErr || "Something went wrong."}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setUploadStep("select")}>
                    Try again
                  </Button>
                  <Button variant="ghost" onClick={closeUploadPortal}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={uploadInputRef}
              onChange={onFileSelected}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
    </FadeIn>
  );
}
