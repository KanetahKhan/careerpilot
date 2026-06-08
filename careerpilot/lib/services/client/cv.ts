"use client";

import type { BuilderCv } from "@/lib/cv-transform";
import { getErrorMessage } from "@/lib/errors";

/* ── Types ───────────────────────────────────────────────────────────── */

export type UploadResult = {
  ok: boolean;
  fileName: string;
  chunks: number;
  sections: string[];
  rawText: string;
  extracted: ExtractedProfile | null;
};

export type ProfileSection = {
  section: string;
  chunks: { position: number; content: string }[];
};

export type CvProfile = {
  document: { fileName: string; createdAt: string } | null;
  sections: ProfileSection[];
  totalChunks: number;
};

export type ExtractedProfile = {
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

/* ── Error wrapper ────────────────────────────────────────────────────── */

class CvApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CvApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore */ }
    throw new CvApiError(message, res.status);
  }
  return res.json();
}

/* ── API methods ──────────────────────────────────────────────────────── */

export async function uploadCv(file: File, signal?: AbortSignal): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/cv/upload", { method: "POST", body: fd, signal });
  return handleResponse<UploadResult>(res);
}

export async function extractCvText(text: string, signal?: AbortSignal): Promise<ExtractedProfile> {
  const res = await fetch("/api/cv/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  const data = await handleResponse<{ extracted: ExtractedProfile }>(res);
  return data.extracted;
}

export async function saveBuilderCv(cv: BuilderCv, signal?: AbortSignal): Promise<void> {
  const res = await fetch("/api/cv/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cv),
    signal,
  });
  await handleResponse<unknown>(res);
}

export async function getBuilderCv(signal?: AbortSignal): Promise<BuilderCv | null> {
  const res = await fetch("/api/cv/build", { cache: "no-store", signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && typeof data === "object" && "fullName" in data) {
    return data as BuilderCv;
  }
  return null;
}

export async function getCvProfile(signal?: AbortSignal): Promise<CvProfile | null> {
  const res = await fetch("/api/cv/profile", { signal });
  if (!res.ok) return null;
  return res.json();
}

export function extractedToBuilderCv(extracted: ExtractedProfile): BuilderCv {
  return {
    fullName: extracted.fullName ?? "",
    headline: "",
    email: extracted.email ?? "",
    phone: extracted.phone ?? "",
    location: extracted.location ?? "",
    summary: extracted.summary ?? "",
    skills: extracted.skills ?? [],
    experience: (extracted.experience ?? []).map((e) => ({
      title: e.title,
      company: e.company,
      start: e.duration ?? "",
      end: "",
      bullets: e.description ? [e.description] : [],
    })),
    education: (extracted.education ?? []).map((e) => ({
      degree: e.degree,
      institution: e.institution,
      start: e.year ?? "",
      end: "",
      details: "",
    })),
    projects: (extracted.projects ?? []).map((p) => ({
      name: p.name,
      description: p.description ?? "",
      tech: p.technologies ?? [],
      githubUrl: p.githubUrl ?? "",
      liveUrl: p.liveUrl ?? "",
    })),
    certifications: [],
    extracurricular: [],
  };
}

export { CvApiError, getErrorMessage };
