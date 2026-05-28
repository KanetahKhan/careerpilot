/**
 * The public portfolio snapshot.
 *
 * This is the ONLY shape the public /p/[slug] page reads — it is built once
 * from the user's already-parsed CV (via lib/cv-transform) and frozen into the
 * `portfolios.data` jsonb column. Keep it to intended-public fields only:
 * `contact` is omitted unless the owner opts in at generate time.
 */
export interface PortfolioData {
  name: string;
  headline: string;
  summary: string;
  experience: {
    title: string;
    company: string;
    start?: string;
    end?: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    description: string;
    tech?: string[];
  }[];
  skills: string[];
  education: {
    degree: string;
    institution: string;
    start?: string;
    end?: string;
    details?: string;
  }[];
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}
