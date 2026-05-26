"use client";

import type { BuilderCv } from "@/lib/cv-transform";

export const PRINT_KEYS = {
  coverLetter: "cp_print_cover_letter",
  cv: "cp_print_cv",
} as const;

type LetterPayload = {
  kind: "cover_letter";
  title?: string;
  filename?: string;
  content: string;
};

type CvPayload = {
  kind: "cv";
  title?: string;
  filename?: string;
  content: BuilderCv;
};

async function postExport(payload: LetterPayload | CvPayload): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? `Export failed (${res.status})`);
  }

  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename="?([^"]+)"?/i);
  const fallback = payload.filename || (payload.kind === "cv" ? "cv.docx" : "cover-letter.docx");
  const filename = m?.[1] || fallback;

  const blob = await res.blob();
  return { blob, filename };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadCoverLetterDocx(content: string, opts: { title?: string; filename?: string } = {}) {
  const { blob, filename } = await postExport({
    kind: "cover_letter",
    content,
    title: opts.title,
    filename: opts.filename,
  });
  triggerDownload(blob, filename);
}

export async function downloadCvDocx(cv: BuilderCv, opts: { filename?: string } = {}) {
  const { blob, filename } = await postExport({
    kind: "cv",
    content: cv,
    filename: opts.filename,
  });
  triggerDownload(blob, filename);
}

export function printCoverLetter(content: string, opts: { title?: string } = {}) {
  try {
    sessionStorage.setItem(
      PRINT_KEYS.coverLetter,
      JSON.stringify({ content, title: opts.title })
    );
  } catch {
    // sessionStorage can throw in private modes; fall through to opening the tab anyway
  }
  window.open("/print/cover-letter", "_blank", "noopener");
}

export function printCv(cv: BuilderCv) {
  try {
    sessionStorage.setItem(PRINT_KEYS.cv, JSON.stringify(cv));
  } catch {
    // ignore
  }
  window.open("/print/cv", "_blank", "noopener");
}

/** Heuristic — used to flag historical assistant messages that look like a letter. */
export function looksLikeCoverLetter(text: string): boolean {
  if (!text) return false;
  const opens = /(^|\n)\s*Dear\b/i.test(text);
  const closes = /\b(Sincerely|Best regards|Yours (truly|sincerely)|Kind regards|Warm regards)\b/i.test(text);
  return opens && closes;
}
