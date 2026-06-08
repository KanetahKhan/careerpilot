// Static top-level require — keeps pdf-parse out of the client bundle
// AND lets Turbopack treat it as an external package (serverExternalPackages)
// so its internal dynamic require() works at runtime via Node.js.
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

export type Chunk = { section: string; content: string; position: number };

const MAX_TEXT_LENGTH = 10_000; // Memory safety: cap at 10K chars

/** Post-process raw PDF text to restore line breaks lost during extraction. */
function normalizePdfText(raw: string): string {
  let text = raw;
  // Collapse Windows line endings
  text = text.replace(/\r\n/g, '\n');
  // Insert newline before capitalized section headers merged with previous text
  text = text.replace(
    /([a-z)])([A-Z][a-z]+ (?:Housing|University|College|School|Skills|Projects|Experience|Interests|Achievements|Volunteering|Coursework|Education))/g,
    '$1\n$2'
  );
  // Ensure # headers have a space after them so splitSections picks them up
  text = text.replace(/^#+/gm, '$& ');
  return text;
}

/** Extract raw text from an uploaded PDF or DOCX buffer. */
export async function extractText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();
  let text: string;
  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    text = value;
  } else if (lower.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    text = normalizePdfText(data.text);
  } else {
    text = buffer.toString("utf-8");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`[cv] Truncating CV text from ${text.length} to ${MAX_TEXT_LENGTH}`);
    text = text.slice(0, MAX_TEXT_LENGTH);
  }
  return text;
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
  const trimmed = line.trim().replace(/^#+\s*/i, ""); // Strip optional # prefix
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
