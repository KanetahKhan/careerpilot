import type { CVProfile } from "@/types/cv";

interface BackendSection {
  section: string;
  chunks: { position: number; content: string }[];
}

interface BackendResponse {
  document: { fileName: string; createdAt: string } | null;
  sections: BackendSection[];
  totalChunks: number;
}

function getSectionText(sections: BackendSection[], name: string): string {
  const section = sections.find((s) => s.section === name);
  if (!section) return "";
  return section.chunks
    .sort((a, b) => a.position - b.position)
    .map((c) => c.content)
    .join("\n")
    .trim();
}

function extractEmail(text: string): string {
  const m = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return m ? m[0] : "";
}

function extractPhone(text: string): string {
  const m = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/);
  return m ? m[0].trim() : "";
}

function extractName(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (
      line.length > 3 &&
      line.length < 60 &&
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("+") &&
      !/^\d/.test(line)
    ) {
      return line;
    }
  }
  return "";
}

function extractLinks(text: string): { linkedin?: string; github?: string; website?: string } {
  const links: { linkedin?: string; github?: string; website?: string } = {};
  const linkedinM = text.match(/linkedin\.com\/[\w-]+/);
  if (linkedinM) links.linkedin = `https://${linkedinM[0]}`;
  const githubM = text.match(/github\.com\/[\w-]+/);
  if (githubM) links.github = `https://${githubM[0]}`;
  const websiteM = text.match(/(?:https?:\/\/)?(?:www\.)?(?!linkedin|github)[\w-]+\.[\w-]+/);
  if (websiteM && !websiteM[0].includes("linkedin") && !websiteM[0].includes("github")) {
    links.website = websiteM[0].startsWith("http") ? websiteM[0] : `https://${websiteM[0]}`;
  }
  return links;
}

function parseSkills(text: string): CVProfile["skills"] {
  if (!text) return [];
  const items = text
    .split(/[,;\n]/)
    .map((s) => s.replace(/^[-•*]\s*/, "").replace(/skills?/i, "").trim())
    .filter((s) => s.length > 1 && s.length < 40);

  const known: Record<string, string[]> = {
    Languages: [],
    "Tools & IDEs": [],
    "Soft Skills": [],
    Coursework: [],
  };

  const languageKeywords = /^[#+]\s*|^(java|python|c[+#]*|javascript|typescript|sql|ruby|go|rust|swift|kotlin|php|scala|r\b|bash|shell|html|css|sass|less)$/i;
  const toolKeywords = /(git|docker|vscode|intellij|pycharm|webstorm|eclipse|jenkins|aws|gcp|azure|linux|unix|jira|figma|canva)/i;
  const softKeywords = /(adapt|collaborat|communicat|leadership|team|creative|problem.solv|analyti|organi[sz]|time.manag)/i;
  const courseworkKeywords = /(oop|data.struct|algorithm|database|dbms|network|operating.system|software.eng|machine.learn|ai\b|computer.vision|compiler|computer.org|digital.logic)/i;

  for (const item of items) {
    if (languageKeywords.test(item)) {
      known.Languages.push(item);
    } else if (toolKeywords.test(item)) {
      known["Tools & IDEs"].push(item);
    } else if (softKeywords.test(item)) {
      known["Soft Skills"].push(item);
    } else if (courseworkKeywords.test(item)) {
      known.Coursework.push(item);
    } else {
      known["Tools & IDEs"].push(item);
    }
  }

  const colors = ["#2563eb", "#7c3aed", "#059669", "#dc2626"];
  return Object.entries(known)
    .filter(([, items]) => items.length > 0)
    .map(([category, items], i) => ({
      category,
      items: [...new Set(items)],
      color: colors[i % colors.length],
    }));
}

function parseProjects(text: string): CVProfile["projects"] {
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split("\n").filter(Boolean);
    const name = lines[0]?.replace(/^[-•*]\s*/, "").trim() || `Project ${i + 1}`;
    const rest = lines.slice(1).join(" ");

    const techKeywords = /(java|c\+\+|python|javascript|swing|react|node|express|mongodb|sql|git|docker|html|css|oop)/gi;
    const techStack = [...new Set((rest.match(techKeywords) || []).map((t) => t.trim()))];

    const githubM = rest.match(/github\.com\/[\w/-]+/);
    const githubUrl = githubM ? `https://${githubM[0]}` : "";

    return {
      id: `proj-${i + 1}`,
      name,
      techStack: techStack.length > 0 ? techStack : ["Other"],
      description: rest.slice(0, 150) || name,
      githubUrl,
    };
  });
}

function parseEducation(text: string): CVProfile["education"] {
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const full = lines.join(" ");

    const degreeM = full.match(/\b(B\.?Sc|M\.?Sc|Ph\.?D|MBA|Bachelor|Master|Higher Secondary|HSC|SSC|Diploma|Associate)/i);
    const yearM = full.match(/(\d{4})\s*(?:-|–|to)\s*(\d{4}|Present|Expected)/i) || full.match(/(\d{4})/);
    const gpaM = full.match(/(?:CGPA|GPA|Grade)[:\s]*([\d.]+)\s*\/?\s*([\d.]+)?/i) || full.match(/\b([\d.]+)\s*\/\s*([\d.]+)\b/);

    const institution = lines.find(
      (l) => l.length > 10 && !l.includes("@") && !l.match(/^\d/) && !l.match(/http/)
    ) || lines[0] || "";

    return {
      id: `edu-${i + 1}`,
      institution,
      degree: degreeM ? degreeM[1] : "",
      field: full.includes("Software") ? "Software Engineering" : full.includes("Computer") ? "Computer Science" : undefined,
      expectedGraduation: yearM && yearM[2]?.toLowerCase() === "expected" ? yearM[1] : undefined,
      endYear: yearM && yearM[2] && yearM[2].toLowerCase() !== "expected" ? yearM[2] : undefined,
      gpa: gpaM ? gpaM[1] : undefined,
      gpaScale: gpaM && gpaM[2] ? gpaM[2] : undefined,
    };
  });
}

function parseCertifications(text: string): CVProfile["certifications"] {
  if (!text) return [];
  const lines = text.split("\n").filter(Boolean);
  return lines.map((line, i) => {
    const yearM = line.match(/(\d{4})/);
    return {
      id: `cert-${i + 1}`,
      title: line.replace(/^\d+[.)]\s*/, "").trim(),
      year: yearM ? yearM[1] : "",
    };
  });
}

function parseExtracurricular(text: string): CVProfile["extracurricular"] {
  if (!text) return [];
  const lines = text.split("\n").filter((l) => l.trim().length > 2);
  const result: CVProfile["extracurricular"] = [];
  let current: CVProfile["extracurricular"][0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, "");
    if (trimmed.length > 15 && !current) {
      current = { organization: trimmed, role: "", activities: [] };
    } else if (current && trimmed.length > 3 && trimmed.length < 40 && !current.role) {
      current.role = trimmed;
    } else if (current && trimmed.length > 3) {
      current.activities.push(trimmed);
    }
    if (current && current.organization && (current.role || current.activities.length > 0)) {
      result.push(current);
      current = null;
    }
  }
  if (current && current.organization) {
    result.push(current);
  }
  return result;
}

export function transformBackendData(raw: BackendResponse): CVProfile {
  const sections = raw?.sections ?? [];

  const otherText = getSectionText(sections, "other");
  const summaryText = getSectionText(sections, "summary");
  const skillsText = getSectionText(sections, "skills");
  const experienceText = getSectionText(sections, "experience");
  const projectsText = getSectionText(sections, "projects");
  const educationText = getSectionText(sections, "education");
  const certText = getSectionText(sections, "certifications");

  const headerText = otherText || summaryText || sections.map((s) => s.chunks.map((c) => c.content).join("\n")).join("\n");
  const links = extractLinks(headerText);

  const allProjects = [...parseProjects(experienceText), ...parseProjects(projectsText)];
  const allEducation = parseEducation(educationText);
  const skills = parseSkills(skillsText);

  return {
    personal: {
      name: extractName(headerText) || "Your Name",
      email: extractEmail(headerText),
      phone: extractPhone(headerText),
      location: "",
      linkedin: links.linkedin,
      github: links.github,
      website: links.website,
    },
    education: allEducation,
    skills: skills.length > 0 ? skills : [{ category: "Skills", items: skillsText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean), color: "#2563eb" }],
    projects: allProjects,
    certifications: parseCertifications(certText),
    extracurricular: parseExtracurricular(otherText),
  };
}
