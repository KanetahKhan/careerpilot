import { createHash } from "node:crypto";
import { extractText, chunkCv, type Chunk } from "./cv";
import { embedBatch, isEmbeddingEnabled, LLM_ENABLED } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = {
  fileName: string;
  chunks: number;
  sections: string[];
  rawText: string;
  extracted: ExtractedProfile | null;
};

// ── Structured entry types ────────────────────────────────────────────────

export type ExperienceEntry = {
  title: string;
  company: string;
  duration?: string;
  description?: string;
};

export type EducationEntry = {
  degree: string;
  institution: string;
  year?: string;
};

export type ProjectEntry = {
  name: string;
  description?: string;
  technologies?: string[];
  githubUrl?: string;
  liveUrl?: string;
};

// ── New nested-sections shape ────────────────────────────────────────────

export type SectionContent = {
  summary?: string;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: string[];
  projects?: ProjectEntry[];
  certifications?: string[];
  interests?: string[];
  coursework?: string[];
  achievements?: string[];
};

// ── Backward-compat flat ExtractedProfile ─────────────────────────────────

export type ExtractedProfile = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  /** Per-section structured data */
  sections: SectionContent;
  // Legacy flat fields (populated from sections for backward compat)
  summary?: string;
  skills?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  projects?: ProjectEntry[];
};

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;
const OVERLAP = 100;
const MAX_CHUNKS = 50;

// ── Header-only section patterns ─────────────────────────────────────────
// Each pattern must match the ENTIRE line (after stripping # prefix & trailing colon)
// to avoid triggering on content lines that happen to contain a keyword.

const HEADER_PATTERNS: Record<string, RegExp> = {
  summary: /^(?:summary|profile|objective|about\s+me|professional\s+summary)$/i,
  education: /^(?:education|academic\s+background|qualifications?|degrees?)$/i,
  experience: /^(?:experience|work\s+experience|employment|professional\s+experience|career|internships?|volunteer\s+experience)$/i,
  skills: /^(?:skills|technical\s+skills|competencies|expertise|technologies|tools)$/i,
  projects: /^(?:projects|portfolio|personal\s+projects|academic\s+projects)$/i,
  certifications: /^(?:certifications?|licenses?|accreditations)$/i,
  interests: /^(?:interests|hobbies|activities)$/i,
  coursework: /^(?:coursework|courses|relevant\s+courses)$/i,
  achievements: /^(?:achievements|awards?|honors?|accomplishments)$/i,
};

// ── Section detection (header-only, no content keywords) ─────────────────

function detectSection(line: string): string | null {
  if (line.length > 60) return null;

  const cleaned = line.replace(/^#+\s*/, "").replace(/:$/, "").trim();
  if (!cleaned || cleaned.length > 50) return null;

  // Must look like a heading — markdown, ALL-CAPS, or Title Case
  const isHeaderStyle =
    line.startsWith("#") ||
    (cleaned === cleaned.toUpperCase() && cleaned.length >= 3 && cleaned.length <= 30) ||
    /^[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*$/.test(cleaned);

  if (!isHeaderStyle) return null;

  const lower = cleaned.toLowerCase();
  for (const [section, pattern] of Object.entries(HEADER_PATTERNS)) {
    if (pattern.test(lower)) return section;
  }

  return null;
}

// ── Section-block builder ────────────────────────────────────────────────

interface SectionBlock {
  section: string;
  lines: string[];
}

function buildSectionBlocks(lines: string[]): SectionBlock[] {
  const blocks: SectionBlock[] = [];
  let currentSection = "header";
  let currentLines: string[] = [];

  for (const line of lines) {
    const detected = detectSection(line);
    if (detected) {
      if (currentLines.length > 0) {
        blocks.push({ section: currentSection, lines: currentLines });
        currentLines = [];
      }
      currentSection = detected;
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    blocks.push({ section: currentSection, lines: currentLines });
  }

  return blocks.filter((b) => b.lines.join("").trim().length > 0);
}

// ── Contact / header extractors ──────────────────────────────────────────

function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/\+\d{7,}/);
  return m?.[0];
}

function extractLinkedIn(text: string): string | undefined {
  const m = text.match(/linkedin\.com\/[a-zA-Z0-9_-]+/i);
  return m ? `https://${m[0].toLowerCase()}` : undefined;
}

function extractGitHub(text: string): string | undefined {
  const m = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  return m ? `https://${m[0].toLowerCase()}` : undefined;
}

function extractName(lines: string[]): string | undefined {
  for (const line of lines) {
    if (
      line.length > 2 &&
      line.length < 50 &&
      !line.includes("@") &&
      !line.includes("|") &&
      !/^[+\d]/.test(line) &&
      !line.match(/github|linkedin/i)
    ) {
      return line;
    }
  }
  return undefined;
}

function extractLocation(lines: string[]): string | undefined {
  for (const line of lines) {
    if (
      /^[A-Z][a-z]+,\s*[A-Z]/.test(line) &&
      !line.includes("@") &&
      !line.includes("github") &&
      !line.includes("linkedin") &&
      line.length < 50
    ) {
      return line;
    }
  }
  return undefined;
}

// ── Entity extraction per section ─────────────────────────────────────────

function parseSummary(lines: string[]): string | undefined {
  const joined = lines.slice(0, 3).join(" ");
  return joined.length > 20 ? joined.slice(0, 500) : undefined;
}

function parseEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let current: EducationEntry | null = null;

  for (const line of lines) {
    if (
      /University|College|School|Institute/i.test(line) &&
      !/GPA|CGPA|Year|Graduation|Passing|Bachelor|Master/i.test(line)
    ) {
      if (current) entries.push(current);
      current = { institution: line, degree: "" };
    } else if (/Bachelor|Master|Secondary|Higher|Certificate|Diploma|HSC|SSC|B\.?S\.?c?|M\.?S\.?c?/i.test(line)) {
      if (current) current.degree = line;
      else current = { institution: "", degree: line };
    } else if (/GPA|CGPA/i.test(line)) {
      if (!current) current = { institution: "", degree: "" };
    } else if (/Year|Graduation|Passing|Expected/i.test(line)) {
      if (!current) current = { institution: "", degree: "" };
      const yM = line.match(/20\d{2}/);
      if (yM) current.year = yM[0];
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseSkills(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    if (line.includes(":")) {
      const items = line.split(":").slice(1).join(":");
      const parts = items
        .split(/[,;]/)
        .map((s) => s.replace(/\s*\(.*?\)/g, "").trim())
        .filter(Boolean);
      skills.push(...parts);
    } else {
      const parts = line.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      skills.push(...parts);
    }
  }
  return [...new Set(skills.map((s) => s.toLowerCase()))]
    .filter((s) => s.length > 0 && s.length < 40)
    .slice(0, 30);
}

function parseProjects(lines: string[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  let current: ProjectEntry | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*[–-]\s*(.+)/);
    if (headerMatch) {
      if (current) entries.push(current);
      const link = headerMatch[3].trim();
      current = {
        name: headerMatch[1].trim(),
        technologies: headerMatch[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        description: "",
      };
      if (/github/i.test(link) || link.includes("github.com")) {
        current.githubUrl = link.startsWith("http") ? link : `https://github.com/${link.replace(/^https?:\/\/github\.com\//i, "")}`;
      } else if (link.startsWith("http")) {
        current.liveUrl = link;
      }
    } else if (current && line.length > 5) {
      current.description += (current.description ? " " : "") + line;
    } else if (!current && line.length > 3 && line.length < 60) {
      current = { name: line, technologies: [], description: "" };
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;

  for (const line of lines) {
    const sepMatch = line.match(/^(.+?)\s*[|–—-]\s*(.+?)\s*[|–—-]\s*(.+)/);
    if (sepMatch) {
      if (current) entries.push(current);
      current = {
        title: sepMatch[1].trim(),
        company: sepMatch[2].trim(),
        duration: sepMatch[3].trim(),
        description: "",
      };
    } else if (current) {
      current.description += (current.description ? " " : "") + line;
    } else {
      current = { title: line, company: "", description: "" };
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseSimpleList(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split(/[,;]/).map((s) => s.trim()).filter(Boolean))
    .filter((s) => s.length > 0 && s.length < 40);
}

// ── Route block → entities ───────────────────────────────────────────────

function extractEntities(block: SectionBlock): Partial<SectionContent> {
  switch (block.section) {
    case "summary":
      return { summary: parseSummary(block.lines) };
    case "education":
      return { education: parseEducation(block.lines) };
    case "skills":
      return { skills: parseSkills(block.lines) };
    case "projects":
      return { projects: parseProjects(block.lines) };
    case "experience":
      return { experience: parseExperience(block.lines) };
    case "certifications":
    case "interests":
    case "coursework":
    case "achievements":
      return { [block.section]: parseSimpleList(block.lines) };
    default:
      return {};
  }
}

// ── AI classification for ambiguous lines (gated) ────────────────────────
// Only called when LLM_ENABLED is true at runtime. Uses a direct Groq REST
// call (no AI SDK) to keep the import graph lean.

async function classifyLinesWithAI(
  blocks: SectionBlock[]
): Promise<Partial<SectionContent>> {
  if (!LLM_ENABLED) return {};
  if (blocks.length === 0) return {};

  try {
    const unknownLines = blocks
      .filter((b) => b.section === "header")
      .flatMap((b) => b.lines)
      .slice(0, 50);

    if (unknownLines.length === 0) return {};

    const prompt = unknownLines.map((l, i) => `${i}: "${l.substring(0, 120)}"`).join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "Classify each numbered line into one of: summary, education, experience, skills, projects, certifications, interests, coursework, achievements, or none. Return a JSON array of strings in the same order as input.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};
    const parsed: string[] = JSON.parse(content);
    if (!Array.isArray(parsed)) return {};

    const result: Partial<SectionContent> = {};
    for (let i = 0; i < Math.min(parsed.length, unknownLines.length); i++) {
      const section = parsed[i];
      if (section && section !== "none" && section in result) {
        (result as any)[section].push(unknownLines[i]);
      } else if (section && section !== "none") {
        (result as any)[section] = [unknownLines[i]];
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ── Main extraction orchestrator (sync, pure regex) ──────────────────────

export function extractProfileFromText(text: string): ExtractedProfile {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const rawLines = cleaned.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const blocks = buildSectionBlocks(rawLines);

  // Header / contact info
  const headerBlock = blocks.find((b) => b.section === "header");
  const headerLines = headerBlock?.lines ?? [];
  const headerText = headerLines.join("\n");

  const fullName = extractName(headerLines);
  const email = extractEmail(headerText) || extractEmail(text);
  const phone = extractPhone(headerText) || extractPhone(text);
  const location = extractLocation(headerLines);
  const linkedin = extractLinkedIn(headerText) || extractLinkedIn(text);
  const github = extractGitHub(headerText) || extractGitHub(text);

  // Per-section entity extraction
  const sections: SectionContent = {};
  for (const block of blocks) {
    if (block.section === "header") continue;
    Object.assign(sections, extractEntities(block));
  }

  const result: ExtractedProfile = {
    fullName,
    email,
    phone,
    location,
    linkedin,
    github,
    sections,
    summary: sections.summary,
    skills: sections.skills?.length ? sections.skills : undefined,
    experience: sections.experience?.length ? sections.experience : undefined,
    education: sections.education?.length ? sections.education : undefined,
    projects: sections.projects?.length ? sections.projects : undefined,
  };

  console.log("[EXTRACTED]", JSON.stringify({
    name: result.fullName,
    email: result.email,
    phone: result.phone,
    location: result.location,
    education: result.education?.length,
    skills: result.skills?.length,
    projects: result.projects?.length,
    experience: result.experience?.length,
    sections: Object.keys(sections),
  }));

  return result;
}

/* ── Embedding (unchanged) ────────────────────────────────────────────── */

function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const out = new Array(dim).fill(0);
  for (const v of embeddings) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= embeddings.length;
  return out;
}

async function embedBatchWithCache(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const supabase = createAdminClient();
  const hashes = texts.map((t) => contentHash(t));

  const { data: cached } = await supabase
    .from("embedding_cache")
    .select("hash, vector")
    .in("hash", hashes);

  const cacheMap = new Map<string, number[]>();
  if (cached) {
    for (const row of cached as { hash: string; vector: number[] }[]) {
      cacheMap.set(row.hash, row.vector);
    }
  }

  const results: number[][] = [];
  const missedTexts: string[] = [];
  const missedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const vec = cacheMap.get(hashes[i]);
    if (vec) {
      results[i] = vec;
    } else {
      missedTexts.push(texts[i]);
      missedIndices.push(i);
    }
  }

  if (missedTexts.length > 0) {
    const BATCH_SIZE = 5;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < missedTexts.length; i += BATCH_SIZE) {
      const batch = missedTexts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await embedBatch(batch);
      allEmbeddings.push(...batchEmbeddings);
      if (i + BATCH_SIZE < missedTexts.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    const cacheRows: { hash: string; vector: number[] }[] = [];
    let embIdx = 0;
    for (let j = 0; j < missedTexts.length; j++) {
      const idx = missedIndices[j];
      const vec = allEmbeddings[embIdx++];
      results[idx] = vec;
      cacheRows.push({ hash: hashes[idx], vector: vec });
    }

    if (cacheRows.length > 0) {
      await supabase.from("embedding_cache").upsert(cacheRows, { onConflict: "hash" });
    }
  }

  return results;
}

/* ── Ingest sections (for CV builder) ─────────────────────────────────── */

export async function ingestSections(
  userId: string,
  sections: { section: string; content: string }[],
  fileName = "Built CV",
): Promise<IngestResult> {
  if (!userId || typeof userId !== "string" || userId.length < 8) {
    throw new Error("Invalid user ID");
  }

  const supabase = createAdminClient();

  const { error: profileErr } = await supabase.from("profiles").upsert({ id: userId });
  if (profileErr) {
    throw new Error(`Failed to create profile: ${profileErr.message}`);
  }

  const rawText = sections.map((s) => `=== ${s.section.toUpperCase()} ===\n${s.content}`).join("\n\n");

  const { data: doc, error: docErr } = await supabase
    .from("cv_documents")
    .insert({ user_id: userId, file_name: fileName, raw_text: rawText })
    .select("id")
    .single();
  if (docErr) throw docErr;

  const allChunks: Chunk[] = [];
  let position = 0;

  for (const { section, content } of sections) {
    if (allChunks.length >= MAX_CHUNKS) break;
    let start = 0;
    while (start < content.length && allChunks.length < MAX_CHUNKS) {
      const end = Math.min(start + MAX_CHARS, content.length);
      let breakPoint = end;
      if (end < content.length) {
        const nl = content.lastIndexOf("\n", end);
        if (nl > start) breakPoint = nl + 1;
      }
      allChunks.push({
        section,
        content: content.slice(start, breakPoint).trim(),
        position: position++,
      });
      start = breakPoint - OVERLAP;
      if (start < 0) start = breakPoint;
    }
  }

  console.log(`[ingest] ${allChunks.length} chunks for user=${userId}`);

  // Skip embedding when circuit breaker is active (memory saver)
  const skipEmbedding = !isEmbeddingEnabled();
  let embeddings: number[][];
  if (skipEmbedding) {
    embeddings = [];
  } else {
    embeddings = await embedBatchWithCache(allChunks.map((c) => c.content));
  }

  const rows = allChunks.map((c, i) => ({
    user_id: userId,
    document_id: doc.id,
    section: c.section,
    content: c.content,
    position: c.position,
    embedding: embeddings[i] ?? null,
  }));

  const { error: insErr } = await supabase.from("cv_chunks").insert(rows);
  if (insErr) throw insErr;

  await supabase
    .from("cv_chunks")
    .delete()
    .eq("user_id", userId)
    .neq("document_id", doc.id);

  await supabase
    .from("cv_documents")
    .delete()
    .eq("user_id", userId)
    .neq("id", doc.id);

  const centroid = computeCentroid(embeddings);
  await supabase
    .from("cv_documents")
    .update({ centroid_embedding: centroid })
    .eq("id", doc.id);

  const uniqueSections = [...new Set(allChunks.map((c) => c.section))];

  // Also regex-extract from built CV text for consistency
  const extracted = extractProfileFromText(rawText);

  return { fileName, chunks: allChunks.length, sections: uniqueSections, rawText, extracted };
}

/* ── File upload path ─────────────────────────────────────────────────── */

export async function ingestCv(
  userId: string,
  buffer: Buffer,
  fileName: string
): Promise<IngestResult> {
  const text = await extractText(buffer, fileName);
  if (!text.trim()) throw new Error("Could not extract text from file");

  // Line-based section parsing (header-only regex)
  const extracted = extractProfileFromText(text);

  const sectionBlocks = buildSectionBlocks(
    text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").map(l => l.trim()).filter(l => l.length > 0)
  );

  const sections = sectionBlocks
    .filter(c => c.section !== 'header')
    .map(c => ({
      section: c.section,
      content: c.lines.join("\n"),
    }));

  // If only header exists, treat whole text as summary
  if (sections.length === 0) {
    sections.push({ section: "summary", content: text.slice(0, 3000) });
  }

  const result = await ingestSections(userId, sections, fileName);
  return { ...result, extracted };
}
