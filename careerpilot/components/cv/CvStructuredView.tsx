"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Edit3, Download, Printer, Code, ChevronDown,
  Briefcase, GraduationCap, Code2, Sparkles,
} from "lucide-react";

interface CVChunk {
  position: number;
  content: string;
}

interface CVSection {
  section: string;
  chunks: CVChunk[];
}

interface CvStructuredViewProps {
  sections: CVSection[];
  totalChunks: number;
  profile?: {
    fullName?: string;
    jobTitle?: string;
    location?: string;
    email?: string;
    avatarUrl?: string;
  };
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  exportBusy?: boolean;
  canExport?: boolean;
}

function parseExperience(content: string): {
  company?: string;
  role?: string;
  dateRange?: string;
  bullets: string[];
} {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const role = lines.find(l => /^Title:/i.test(l))?.replace(/^Title:\s*/i, "") || "";
  const company = lines.find(l => /^Company:/i.test(l))?.replace(/^Company:\s*/i, "") || "";
  const start = lines.find(l => /^Start:/i.test(l))?.replace(/^Start:\s*/i, "") || "";
  const end = lines.find(l => /^End:/i.test(l))?.replace(/^End:\s*/i, "") || "";
  const dateRange = [start, end].filter(Boolean).join(" - ") || "";
  const bullets = lines.filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "")).filter(Boolean);
  return { company: company || undefined, role: role || undefined, dateRange: dateRange || undefined, bullets };
}

function parseEducation(content: string): {
  institution?: string;
  degree?: string;
  dateRange?: string;
} {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const degree = lines.find(l => /^Degree:/i.test(l))?.replace(/^Degree:\s*/i, "") || "";
  const institution = lines.find(l => /^Institution:/i.test(l))?.replace(/^Institution:\s*/i, "") || "";
  const start = lines.find(l => /^Start:/i.test(l))?.replace(/^Start:\s*/i, "") || "";
  const end = lines.find(l => /^End:/i.test(l))?.replace(/^End:\s*/i, "") || "";
  const dateRange = [start, end].filter(Boolean).join(" - ") || "";
  return { institution: institution || undefined, degree: degree || undefined, dateRange: dateRange || undefined };
}

function parseSkills(content: string): string[] {
  return content.split(/[,•\n]/).map(s => s.replace(/^- /, "").trim()).filter(Boolean);
}

function parseProject(content: string): {
  name?: string;
  tech?: string[];
  description?: string;
} {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const name = lines.find(l => /^Name:/i.test(l))?.replace(/^Name:\s*/i, "") || "";
  const techLine = lines.find(l => /^Tech:/i.test(l))?.replace(/^Tech:\s*/i, "") || "";
  const tech = techLine ? techLine.split(/,\s*/).filter(Boolean) : [];
  const desc = lines.filter(l => !/^(Name|Tech):\s*/i.test(l)).join("\n");
  return { name: name || undefined, tech: tech.length > 0 ? tech : undefined, description: desc || undefined };
}

export function CvStructuredView({ sections, totalChunks, profile, onExportDocx, onExportPdf, exportBusy, canExport }: CvStructuredViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const groupedChunks = sections.reduce((acc, s) => {
    acc[s.section] = s.chunks;
    return acc;
  }, {} as Record<string, CVChunk[]>);

  const summaryContent = groupedChunks.summary?.[0]?.content || "";
  const allSkills = groupedChunks.skills ? parseSkills(groupedChunks.skills.map(c => c.content).join("\n")) : [];
  const technicalSkills = allSkills.filter(s => /^[A-Z#+]|java|python|javascript|typescript|sql|react|node|docker|git|aws/i.test(s));
  const softSkills = allSkills.filter(s => !technicalSkills.includes(s));

  const tabs = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "skills", label: "Skills", icon: Code2 },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "projects", label: "Projects", icon: Code2 },
  ];

  const initials = profile?.fullName
    ? profile.fullName.split(" ").map(n => n[0]).join("")
    : "?";

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{profile?.fullName || "Your Name"}</h1>
            <p className="text-muted-foreground">
              {[profile?.jobTitle, profile?.location].filter(Boolean).join(" • ") || "Professional"}
            </p>
            {profile?.email && (
              <p className="text-sm text-muted-foreground/70">{profile.email}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/profile/edit" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium">
              <Edit3 className="h-4 w-4" />
              Edit CV
            </Link>
            {canExport && (
              <Button size="sm" onClick={onExportDocx} disabled={exportBusy}>
                <Download className="h-4 w-4" />
                {exportBusy ? "Building..." : "Download PDF"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {summaryContent && (
            <div className="panel p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">Professional Summary</h3>
              <p className="leading-relaxed text-foreground">{summaryContent}</p>
            </div>
          )}

          {allSkills.length > 0 && (
            <div className="panel p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">Top Skills</h3>
              <div className="flex flex-wrap gap-2">
                {allSkills.slice(0, 12).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!summaryContent && allSkills.length === 0 && (
            <div className="panel flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No CV data yet</h3>
              <p className="mb-4 max-w-[250px] text-sm text-muted-foreground">
                Upload or build your CV to see it displayed here
              </p>
              <Link href="/profile/edit" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
                Build your CV
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-3">Technical Skills</h3>
            {technicalSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {technicalSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No technical skills found</p>
            )}
          </div>
          <div className="panel p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-3">Soft Skills</h3>
            {softSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {softSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No soft skills found</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "experience" && (
        <div className="space-y-4">
          {(groupedChunks.experience || []).length > 0 ? (
            (groupedChunks.experience || []).map((chunk) => {
              const parsed = parseExperience(chunk.content);
              return (
                <div key={chunk.position} className="panel overflow-hidden p-6">
                  <div className="h-1 w-full rounded-full bg-primary/20 mb-4" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {parsed.company || "Unknown Company"}
                      </h3>
                      {parsed.role && (
                        <p className="text-foreground/80">{parsed.role}</p>
                      )}
                    </div>
                    {parsed.dateRange && (
                      <span className="inline-flex w-fit items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                        {parsed.dateRange}
                      </span>
                    )}
                  </div>
                  {parsed.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {parsed.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          ) : (
            <div className="panel flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No experience yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Add your work experience</p>
              <Link href="/profile/edit" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium">
                Add Experience
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "education" && (
        <div className="space-y-4">
          {(groupedChunks.education || []).length > 0 ? (
            (groupedChunks.education || []).map((chunk) => {
              const parsed = parseEducation(chunk.content);
              return (
                <div key={chunk.position} className="panel p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {parsed.institution || "Unknown Institution"}
                      </h3>
                      {parsed.degree && (
                        <p className="text-muted-foreground">{parsed.degree}</p>
                      )}
                    </div>
                    {parsed.dateRange && (
                      <span className="inline-flex w-fit items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                        {parsed.dateRange}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="panel flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No education yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Add your educational background</p>
              <Link href="/profile/edit" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium">
                Add Education
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(groupedChunks.projects || []).length > 0 ? (
            (groupedChunks.projects || []).map((chunk) => {
              const parsed = parseProject(chunk.content);
              return (
                <div key={chunk.position} className="panel p-5">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {parsed.name || "Project"}
                  </h3>
                  {parsed.tech && parsed.tech.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.tech.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {parsed.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{parsed.description}</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="panel col-span-full flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Code2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No projects yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Add your projects</p>
              <Link href="/profile/edit" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium">
                Add Projects
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-8">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code className="h-4 w-4" />
          {showRaw ? "Hide Raw Chunks" : "Show Raw Chunks"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", showRaw && "rotate-180")} />
        </button>
        {showRaw && (
          <div className="mt-4 overflow-auto rounded-xl bg-muted/50 p-4 font-mono text-xs text-muted-foreground">
            <pre>{JSON.stringify(sections, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
