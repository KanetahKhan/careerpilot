"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cp_print_cover_letter";

type Payload = {
  title?: string;
  content: string;
};

export default function PrintCoverLetterPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setPayload(JSON.parse(raw) as Payload);
    } catch {
      // ignore — render empty state
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !payload) return;
    // Give the browser one paint to lay out before the print dialog appears.
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [ready, payload]);

  if (ready && !payload) {
    return (
      <div className="print-empty p-8 text-center">
        <p className="mb-4">Nothing to print. Open this page from the assistant&apos;s Download → PDF action.</p>
        <a href="/profile" className="text-primary underline hover:no-underline">Go to Profile</a>
      </div>
    );
  }

  if (!payload) return null;

  const paragraphs = payload.content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <div className="actions">
        <button onClick={() => window.print()}>Save as PDF</button>
        <button className="secondary" onClick={() => window.close()}>
          Close
        </button>
      </div>
      {payload.title && <h1>{payload.title}</h1>}
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
