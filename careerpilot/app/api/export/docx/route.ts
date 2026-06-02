import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { buildLetterDocx, buildCvDocx } from "@/lib/export/docx";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

const CoverLetterSchema = z.object({
  kind: z.literal("cover_letter"),
  title: z.string().max(200).optional(),
  filename: z.string().max(120).optional(),
  content: z.string().min(1, "content is required").max(20_000),
});

const CvSchema = z.object({
  kind: z.literal("cv"),
  title: z.string().max(200).optional(),
  filename: z.string().max(120).optional(),
  content: z.object({
    fullName: z.string().default(""),
    headline: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
    experience: z
      .array(
        z.object({
          title: z.string().default(""),
          company: z.string().default(""),
          start: z.string().optional(),
          end: z.string().optional(),
          bullets: z.array(z.string()).default([]),
        })
      )
      .default([]),
    education: z
      .array(
        z.object({
          degree: z.string().default(""),
          institution: z.string().default(""),
          start: z.string().optional(),
          end: z.string().optional(),
          details: z.string().optional(),
        })
      )
      .default([]),
    projects: z
      .array(
        z.object({
          name: z.string().default(""),
          description: z.string().default(""),
          tech: z.array(z.string()).optional(),
        })
      )
      .default([]),
    skills: z.array(z.string()).default([]),
    certifications: z.array(z.string()).optional(),
    extracurricular: z.array(z.string()).optional(),
  }),
});

const BodySchema = z.discriminatedUnion("kind", [CoverLetterSchema, CvSchema]);

function safeFilename(name: string, fallback: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}

export async function POST(req: NextRequest) {
  try {
    const _user = await requireUser();
    if (_user instanceof Response) return _user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let filename: string;

    if (parsed.data.kind === "cover_letter") {
      const paragraphs = parsed.data.content
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((p) => p.replace(/\s+\n/g, "\n").trim())
        .filter(Boolean);
      buffer = await buildLetterDocx({
        title: parsed.data.title,
        paragraphs,
      });
      const fallback = `cover-letter-${new Date().toISOString().slice(0, 10)}.docx`;
      filename = safeFilename(parsed.data.filename || fallback, fallback);
    } else {
      buffer = await buildCvDocx(parsed.data.content);
      const base = parsed.data.content.fullName?.trim().replace(/\s+/g, "-").toLowerCase();
      const fallback = `${base || "my"}-cv.docx`;
      filename = safeFilename(parsed.data.filename || fallback, fallback);
    }

    if (!filename.toLowerCase().endsWith(".docx")) filename += ".docx";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}
