export type Chunk = { section: string; content: string; position: number };

/** Extract raw text from an uploaded PDF or DOCX buffer. */
export async function extractText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (lower.endsWith(".pdf")) {
    // require() keeps pdf-parse out of the edge/client bundle
    const pdf = (await import("pdf-parse")).default;
    const data = await pdf(buffer);
    return data.text;
  }
  // .txt or unknown → treat as plain text
  return buffer.toString("utf-8");
}

const SECTION_PATTERNS: { section: string; re: RegExp }[] = [
  { section: "experience", re: /\b(work experience|professional experience|experience|employment)\b/i },
  { section: "education", re: /\b(education|academic|qualifications)\b/i },
  { section: "projects", re: /\b(projects|personal projects|selected projects)\b/i },
  { section: "skills", re: /\b(skills|technical skills|technologies|tech stack)\b/i },
  { section: "summary", re: /\b(summary|objective|profile|about)\b/i },
  { section: "certifications", re: /\b(certifications|certificates|awards|achievements)\b/i },
];

/** Classify a heading-ish line into a known CV section, or null. */
function classifyHeading(line: string): string | null {
  const trimmed = line.trim();
  // Headings are usually short and not full sentences.
  if (trimmed.length === 0 || trimmed.length > 40) return null;
  for (const { section, re } of SECTION_PATTERNS) {
    if (re.test(trimmed)) return section;
  }
  return null;
}

/**
 * Section-aware chunking. We walk the document line by line, switch the
 * "current section" whenever we hit a recognized heading, and accumulate
 * text into ~`maxChars` chunks with a small overlap. Tagging chunks by
 * section is what lets the UI show "Cited from: Experience → ..." later.
 */
export function chunkCv(text: string, maxChars = 1200, overlap = 150): Chunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: Chunk[] = [];
  let currentSection = "other";
  let buffer = "";
  let position = 0;

  const flush = () => {
    const content = buffer.trim();
    if (content.length > 0) {
      chunks.push({ section: currentSection, content, position: position++ });
    }
    // keep a tail of the previous chunk as overlap for context continuity
    buffer = content.slice(Math.max(0, content.length - overlap));
  };

  for (const line of lines) {
    const heading = classifyHeading(line);
    if (heading) {
      flush();
      currentSection = heading;
      buffer = "";
      continue;
    }
    buffer += line + "\n";
    if (buffer.length >= maxChars) flush();
  }
  // final flush without keeping overlap
  const tail = buffer.trim();
  if (tail.length > 0) {
    chunks.push({ section: currentSection, content: tail, position: position++ });
  }
  return chunks;
}
