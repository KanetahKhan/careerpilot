"use client";

import { useEffect, useState } from "react";
import type { BuilderCv } from "@/lib/cv-transform";

const STORAGE_KEY = "cp_print_cv";

export default function PrintCvPage() {
  const [cv, setCv] = useState<BuilderCv | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setCv(JSON.parse(raw) as BuilderCv);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !cv) return;
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [ready, cv]);

  if (ready && !cv) {
    return (
      <div className="print-empty">
        Nothing to print. Open this page from the profile&apos;s Download → PDF action.
      </div>
    );
  }

  if (!cv) return null;

  const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join(" · ");

  return (
    <>
      <div className="actions">
        <button onClick={() => window.print()}>Save as PDF</button>
        <button className="secondary" onClick={() => window.close()}>
          Close
        </button>
      </div>

      <h1 className="center">{cv.fullName || "Untitled CV"}</h1>
      {cv.headline && <p className="center muted">{cv.headline}</p>}
      {contact && <p className="center muted">{contact}</p>}

      {cv.summary && (
        <>
          <h2>Summary</h2>
          <p>{cv.summary}</p>
        </>
      )}

      {cv.experience.length > 0 && (
        <>
          <h2>Experience</h2>
          {cv.experience.map((e, i) => {
            const range = [e.start, e.end].filter(Boolean).join(" – ");
            return (
              <div key={i}>
                <h3>
                  {e.title}
                  {e.company && <> · {e.company}</>}
                  {range && <span className="muted"> — {range}</span>}
                </h3>
                {e.bullets.length > 0 && (
                  <ul>
                    {e.bullets.filter((b) => b.trim()).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}

      {cv.education.length > 0 && (
        <>
          <h2>Education</h2>
          {cv.education.map((e, i) => {
            const range = [e.start, e.end].filter(Boolean).join(" – ");
            return (
              <div key={i}>
                <h3>
                  {e.degree}
                  {e.institution && <> · {e.institution}</>}
                  {range && <span className="muted"> — {range}</span>}
                </h3>
                {e.details && <p>{e.details}</p>}
              </div>
            );
          })}
        </>
      )}

      {cv.projects.length > 0 && (
        <>
          <h2>Projects</h2>
          {cv.projects.map((p, i) => (
            <div key={i}>
              <h3>
                {p.name}
                {p.tech && p.tech.length > 0 && (
                  <span className="muted"> — {p.tech.join(", ")}</span>
                )}
              </h3>
              {p.description && <p>{p.description}</p>}
            </div>
          ))}
        </>
      )}

      {cv.skills.length > 0 && (
        <>
          <h2>Skills</h2>
          <p>{cv.skills.join(", ")}</p>
        </>
      )}

      {cv.certifications && cv.certifications.length > 0 && (
        <>
          <h2>Certifications</h2>
          <ul>
            {cv.certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}

      {cv.extracurricular && cv.extracurricular.length > 0 && (
        <>
          <h2>Extracurricular</h2>
          <ul>
            {cv.extracurricular.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
