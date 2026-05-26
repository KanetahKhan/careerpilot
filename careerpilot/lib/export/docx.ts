import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { BuilderCv } from "@/lib/cv-transform";

const BODY_FONT = "Calibri";
const BODY_SIZE = 22; // half-points → 11pt
const HEADING_SIZE = 28; // 14pt

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: BODY_SIZE })],
  });
}

function headingParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, font: BODY_FONT, size: HEADING_SIZE, bold: true }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: BODY_FONT, size: BODY_SIZE })],
  });
}

function titleParagraph(text: string, opts: { center?: boolean } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 120 },
    children: [
      new TextRun({ text, font: BODY_FONT, size: 36, bold: true }), // 18pt
    ],
  });
}

function subtitleParagraph(text: string, opts: { center?: boolean } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 160 },
    children: [
      new TextRun({ text, font: BODY_FONT, size: 22, italics: true }),
    ],
  });
}

/** Build a .docx Buffer from a title + paragraph list (cover letter shape). */
export async function buildLetterDocx(opts: {
  title?: string;
  paragraphs: string[];
}): Promise<Buffer> {
  const children: Paragraph[] = [];
  if (opts.title) children.push(titleParagraph(opts.title));
  for (const p of opts.paragraphs) {
    const trimmed = p.trim();
    if (trimmed) children.push(bodyParagraph(trimmed));
  }
  if (children.length === 0) children.push(bodyParagraph(""));

  const doc = new Document({
    creator: "CareerPilot",
    title: opts.title ?? "Cover Letter",
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

/** Build a .docx Buffer from a structured BuilderCv. */
export async function buildCvDocx(cv: BuilderCv): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(titleParagraph(cv.fullName || "Untitled CV", { center: true }));
  if (cv.headline) {
    children.push(subtitleParagraph(cv.headline, { center: true }));
  }

  const contactBits = [cv.email, cv.phone, cv.location].filter(Boolean).join(" · ");
  if (contactBits) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: contactBits, font: BODY_FONT, size: BODY_SIZE })],
      })
    );
  }

  if (cv.summary) {
    children.push(headingParagraph("Summary"));
    children.push(bodyParagraph(cv.summary));
  }

  if (cv.experience.length > 0) {
    children.push(headingParagraph("Experience"));
    for (const e of cv.experience) {
      const range = [e.start, e.end].filter(Boolean).join(" – ");
      const header = [`${e.title || ""}${e.company ? ` · ${e.company}` : ""}`, range]
        .filter(Boolean)
        .join("  ");
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: header, font: BODY_FONT, size: BODY_SIZE, bold: true })],
        })
      );
      for (const b of e.bullets) {
        if (b.trim()) children.push(bulletParagraph(b.trim()));
      }
    }
  }

  if (cv.education.length > 0) {
    children.push(headingParagraph("Education"));
    for (const e of cv.education) {
      const range = [e.start, e.end].filter(Boolean).join(" – ");
      const header = [
        `${e.degree || ""}${e.institution ? ` · ${e.institution}` : ""}`,
        range,
      ]
        .filter(Boolean)
        .join("  ");
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: header, font: BODY_FONT, size: BODY_SIZE, bold: true })],
        })
      );
      if (e.details) children.push(bodyParagraph(e.details));
    }
  }

  if (cv.projects.length > 0) {
    children.push(headingParagraph("Projects"));
    for (const p of cv.projects) {
      const tech = p.tech && p.tech.length > 0 ? ` — ${p.tech.join(", ")}` : "";
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${p.name}${tech}`, font: BODY_FONT, size: BODY_SIZE, bold: true }),
          ],
        })
      );
      if (p.description) children.push(bodyParagraph(p.description));
    }
  }

  if (cv.skills.length > 0) {
    children.push(headingParagraph("Skills"));
    children.push(bodyParagraph(cv.skills.join(", ")));
  }

  if (cv.certifications && cv.certifications.length > 0) {
    children.push(headingParagraph("Certifications"));
    for (const c of cv.certifications) children.push(bulletParagraph(c));
  }

  if (cv.extracurricular && cv.extracurricular.length > 0) {
    children.push(headingParagraph("Extracurricular"));
    for (const x of cv.extracurricular) children.push(bulletParagraph(x));
  }

  const doc = new Document({
    creator: "CareerPilot",
    title: `${cv.fullName || "CV"} — CV`,
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
