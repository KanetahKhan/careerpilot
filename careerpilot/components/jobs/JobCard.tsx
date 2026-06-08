"use client";

import { Calendar, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Fit } from "@/components/FitBreakdown";

export interface JobCardJob {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string | null;
  link: string | null;
  description?: string;
  deadline?: string | null;
  employerLogo?: string;
  isMock?: boolean;
  fit: Fit;
}

interface JobCardProps {
  job: JobCardJob;
  onDetail: (job: JobCardJob) => void;
}

function snippet(text?: string | null, maxLen = 150): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fitScoreBadge(score: number) {
  if (score >= 80)
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (score >= 60)
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-red-500/15 text-red-600 dark:text-red-400";
}

export function JobCard({ job, onDetail }: JobCardProps) {
  return (
    <div className="group relative flex flex-col bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full">
      <div className="flex items-start justify-between">
        <div className="relative">
          {job.employerLogo ? (
            <img
              src={job.employerLogo}
              alt={job.company}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {job.company.charAt(0).toUpperCase()}
            </div>
          )}
          {job.isMock && (
            <span className="absolute -top-1.5 -left-1.5 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 ring-2 ring-background">
              Demo Data
            </span>
          )}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
            fitScoreBadge(job.fit.score)
          )}
        >
          {job.fit.score}
        </div>
      </div>

      <h3 className="mt-3 text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {job.role}
      </h3>

      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/70">{job.company}</span>
        <span>&middot;</span>
        <span>{job.location}</span>
      </div>

      {job.description && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {snippet(job.description)}
        </p>
      )}

      {job.fit.matchedSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.fit.matchedSkills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {skill}
            </span>
          ))}
          {job.fit.matchedSkills.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{job.fit.matchedSkills.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {job.salary && (
            <span className="font-medium text-foreground/60">{job.salary}</span>
          )}
          {job.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(job.deadline)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onDetail(job)}
          >
            Details
          </Button>
          {job.isMock ? (
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs" disabled>
              Demo — Not Real
            </Button>
          ) : job.link ? (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary h-7 px-3 text-xs"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onDetail(job)}
            >
              View
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
