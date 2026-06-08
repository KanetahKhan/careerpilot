import { createHash } from "node:crypto";
import { extractText, chunkCv, type Chunk } from "./cv";
import { embedBatch, isEmbeddingEnabled } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = {
  fileName: string;
  chunks: number;
  sections: string[];
  rawText: string;
  extracted: ExtractedProfile | null;
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

const MAX_CHARS = 1000;
const OVERLAP = 100;
const MAX_CHUNKS = 50;

/* ── Line-based CV parser ────────────────────────────────────────────────── */

interface SectionChunk {
  section: string;
  lines: string[];
}

const SECTION_KEYWORDS: Record<string, RegExp> = {
  education: /education|academic|qualifications|degrees/i,
  experience: /experience|work|employment|career|professional|internship|volunteer/i,
  skills: /skills|technical|competencies|expertise|technologies|tools/i,
  projects: /projects|portfolio|personal projects|academic projects/i,
  certifications: /certifications|certificates|licenses|accreditations/i,
  interests: /interests|hobbies|activities/i,
  summary: /summary|profile|objective|about me|professional summary/i,
  coursework: /coursework|courses|relevant courses/i,
};

function isContactLine(line: string): boolean {
  return !!(
    line.includes('@') ||
    line.includes('github.com') ||
    line.includes('linkedin.com') ||
    /\+\d{10,}/.test(line) ||
    (/\d{10,}/.test(line) && line.includes('|'))
  );
}

function isSectionHeader(line: string): boolean {
  if (line.length > 60) return false;
  if (line.startsWith('#')) return true;
  if (line === line.toUpperCase() && line.length > 3 && line.length < 30) return true;
  for (const pattern of Object.values(SECTION_KEYWORDS)) {
    if (pattern.test(line)) return true;
  }
  return false;
}

function detectSection(line: string): string {
  const lower = line.toLowerCase().replace(/^#+\s*/, '');
  for (const [name, pattern] of Object.entries(SECTION_KEYWORDS)) {
    if (pattern.test(lower)) return name;
  }
  return 'other';
}

function parseCvToChunks(text: string): SectionChunk[] {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const rawLines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const chunks: SectionChunk[] = [];
  let currentSection = 'header';
  let currentLines: string[] = [];

  for (const line of rawLines) {
    if (isSectionHeader(line)) {
      if (currentLines.length > 0) {
        chunks.push({ section: currentSection, lines: currentLines });
        currentLines = [];
      }
      currentSection = detectSection(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    chunks.push({ section: currentSection, lines: currentLines });
  }

  return chunks.filter(c => c.lines.join('').length > 5);
}

/* ── Basic extractors ───────────────────────────────────────────────────── */

function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/\+\d{10,}/);
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

/* ── Section-specific parsers ───────────────────────────────────────────── */

function parseEducationChunk(lines: string[]): ExtractedProfile["education"] {
  const entries: ExtractedProfile["education"] = [];
  let current: { institution: string; degree: string; year?: string } | null = null;

  for (const line of lines) {
    if (/University|College|School|Institute/i.test(line) && !/GPA|CGPA|Year|Graduation|Passing|Bachelor|Master/i.test(line)) {
      if (current) entries.push(current);
      current = { institution: line, degree: '' };
    } else if (/Bachelor|Master|Secondary|Higher|Certificate|Diploma|HSC|SSC|B\.?S\.?c?|M\.?S\.?c?/i.test(line)) {
      if (current) current.degree = line;
      else current = { institution: '', degree: line };
    } else if (/GPA|CGPA/i.test(line)) {
      if (!current) current = { institution: '', degree: '' };
    } else if (/Year|Graduation|Passing|Expected/i.test(line)) {
      if (!current) current = { institution: '', degree: '' };
      const yM = line.match(/20\d{2}/);
      if (yM) current.year = yM[0];
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseSkillsChunk(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    if (line.includes(':')) {
      const items = line.split(':').slice(1).join(':');
      const parts = items.split(/[,;]/).map(s => s.replace(/\s*\(.*?\)/g, '').trim()).filter(Boolean);
      skills.push(...parts);
    } else {
      const parts = line.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      skills.push(...parts);
    }
  }
  return [...new Set(skills.map(s => s.toLowerCase()))].filter(s => s.length > 0 && s.length < 40).slice(0, 30);
}

function parseProjectsChunk(lines: string[]): ExtractedProfile["projects"] {
  const entries: ExtractedProfile["projects"] = [];
  let current: { name: string; technologies?: string[]; description?: string; githubUrl?: string; liveUrl?: string } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*[–-]\s*(.+)/);
    if (headerMatch) {
      if (current) entries.push(current);
      const link = headerMatch[3].trim();
      current = {
        name: headerMatch[1].trim(),
        technologies: headerMatch[2].split(/[,;]/).map(s => s.trim()).filter(Boolean),
        description: '',
      };
      if (/github/i.test(link) || link.includes('github.com')) {
        current.githubUrl = link.startsWith('http') ? link : `https://github.com/${link.replace(/^https?:\/\/github\.com\//i, '')}`;
      } else if (link.startsWith('http')) {
        current.liveUrl = link;
      }
    } else if (current && line.length > 5) {
      current.description += (current.description ? ' ' : '') + line;
    } else if (!current && line.length > 3 && line.length < 60) {
      current = { name: line, technologies: [], description: '' };
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseExperienceChunk(lines: string[]): ExtractedProfile["experience"] {
  const entries: ExtractedProfile["experience"] = [];
  let current: { title: string; company: string; duration?: string; description?: string } | null = null;

  for (const line of lines) {
    const sepMatch = line.match(/^(.+?)\s*[|–—-]\s*(.+?)\s*[|–—-]\s*(.+)/);
    if (sepMatch) {
      if (current) entries.push(current);
      current = { title: sepMatch[1].trim(), company: sepMatch[2].trim(), duration: sepMatch[3].trim(), description: '' };
    } else if (current) {
      current.description += (current.description ? ' ' : '') + line;
    } else {
      current = { title: line, company: '', description: '' };
    }
  }

  if (current) entries.push(current);
  return entries;
}

/* ── Summary extraction ───────────────────────────────────────────────── */

function extractSummary(lines: string[]): string | undefined {
  const joined = lines.slice(0, 3).join(" ");
  if (joined.length > 20) return joined.slice(0, 500);
  return undefined;
}

/* ── Main extraction orchestrator ─────────────────────────────────────── */

export function extractProfileFromText(text: string): ExtractedProfile {
  const chunks = parseCvToChunks(text);

  const headerChunk = chunks.find(c => c.section === 'header');
  const headerText = headerChunk ? headerChunk.lines.join('\n') : text;

  const name = (() => {
    for (const line of headerChunk?.lines || []) {
      if (line.length > 2 && line.length < 50 && !line.includes('@') && !line.includes('|') && !/^[+\d]/.test(line) && !line.match(/github|linkedin/i)) {
        return line;
      }
    }
    return undefined;
  })();

  const email = extractEmail(headerText) || extractEmail(text);
  const phone = extractPhone(headerText) || extractPhone(text);
  const linkedin = extractLinkedIn(headerText) || extractLinkedIn(text);
  const github = extractGitHub(headerText) || extractGitHub(text);

  const education: ExtractedProfile["education"] = [];
  for (const c of chunks) {
    if (c.section === 'education') {
      const parsed = parseEducationChunk(c.lines);
      if (parsed) education.push(...parsed);
    }
  }

  const skills = [...new Set(
    chunks
      .filter(c => c.section === 'skills')
      .flatMap(c => parseSkillsChunk(c.lines))
      .map(s => s.toLowerCase())
  )].slice(0, 30);

  const projects: ExtractedProfile["projects"] = [];
  for (const c of chunks) {
    if (c.section === 'projects') {
      const parsed = parseProjectsChunk(c.lines);
      if (parsed) projects.push(...parsed);
    }
  }

  const experience: ExtractedProfile["experience"] = [];
  for (const c of chunks) {
    if (c.section === 'experience') {
      const parsed = parseExperienceChunk(c.lines);
      if (parsed) experience.push(...parsed);
    }
  }

  const summary = chunks
    .filter(c => c.section === 'summary')
    .flatMap(c => extractSummary(c.lines))
    .find(Boolean);

  const result: ExtractedProfile = {
    fullName: name,
    email,
    phone,
    summary,
    skills: skills.length > 0 ? skills : undefined,
    experience: experience.length > 0 ? experience : undefined,
    education: education.length > 0 ? education : undefined,
    projects: projects.length > 0 ? projects : undefined,
  };

  console.log('[EXTRACTED]', JSON.stringify({
    name: result.fullName,
    email: result.email,
    phone: result.phone,
    education: result.education?.length,
    skills: result.skills?.length,
    projects: result.projects?.length,
  }, null, 2));

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

  // Line-based section parsing (NO LLM)
  const sectionChunks = parseCvToChunks(text);
  const extracted = extractProfileFromText(text);

  const sections = sectionChunks
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
