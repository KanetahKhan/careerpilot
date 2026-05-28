import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Code2,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { PortfolioData } from "@/types/portfolio";

/**
 * Public, read-only portfolio view — a restyled descendant of components/cv/*
 * built on the app's design tokens (`panel`, `label`, `chip`, the HSL theme
 * vars) so it matches the product without depending on the orphaned cv-card CSS.
 * Server-renderable: no client state, no auth.
 */

const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

function dateRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

function Hero({ data }: { data: PortfolioData }) {
  const c = data.contact;
  return (
    <header className="panel relative overflow-hidden p-8 md:p-10">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.4)" }}
      />
      <div className="relative flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
          {(data.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{data.name}</h1>
          {data.headline && <p className="mt-1 text-lg font-medium text-primary">{data.headline}</p>}
        </div>
      </div>

      {data.summary && (
        <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {data.summary}
        </p>
      )}

      {c && (
        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          {c.email && (
            <a href={`mailto:${c.email}`} className="chip border border-border bg-secondary text-secondary-foreground hover:border-primary/50">
              <Mail size={13} /> {c.email}
            </a>
          )}
          {c.phone && (
            <span className="chip border border-border bg-secondary text-secondary-foreground">
              <Phone size={13} /> {c.phone}
            </span>
          )}
          {c.location && (
            <span className="chip border border-border bg-secondary text-secondary-foreground">
              <MapPin size={13} /> {c.location}
            </span>
          )}
          {c.linkedin && (
            <a href={c.linkedin} target="_blank" rel="noreferrer" className="chip border border-border bg-secondary text-secondary-foreground hover:border-primary/50">
              <LinkedInIcon /> LinkedIn
            </a>
          )}
          {c.github && (
            <a href={c.github} target="_blank" rel="noreferrer" className="chip border border-border bg-secondary text-secondary-foreground hover:border-primary/50">
              <GitHubIcon /> GitHub
            </a>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" className="chip border border-border bg-secondary text-secondary-foreground hover:border-primary/50">
              <Globe size={13} /> Website
            </a>
          )}
        </div>
      )}
    </header>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
      <span className="text-primary">{icon}</span>
      {children}
    </h2>
  );
}

function ExperienceSection({ experience }: { experience: PortfolioData["experience"] }) {
  if (experience.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<Briefcase size={20} />}>Experience</SectionHeading>
      <div className="space-y-4">
        {experience.map((e, i) => (
          <div key={`${e.company}-${i}`} className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="font-semibold text-foreground">
                {e.title}
                {e.company && <span className="text-muted-foreground"> &middot; {e.company}</span>}
              </h3>
              {dateRange(e.start, e.end) && (
                <span className="label">{dateRange(e.start, e.end)}</span>
              )}
            </div>
            {e.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {e.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsSection({ projects }: { projects: PortfolioData["projects"] }) {
  if (projects.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<Code2 size={20} />}>Projects</SectionHeading>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p, i) => (
          <div key={`${p.name}-${i}`} className="panel flex flex-col p-5">
            <h3 className="font-semibold text-foreground">{p.name}</h3>
            {p.tech && p.tech.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.tech.map((t) => (
                  <span key={t} className="chip bg-primary/10 text-primary">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {p.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillsSection({ skills }: { skills: PortfolioData["skills"] }) {
  if (skills.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<Sparkles size={20} />}>Skills</SectionHeading>
      <div className="panel flex flex-wrap gap-2 p-5">
        {skills.map((s) => (
          <span key={s} className="chip border border-border bg-secondary text-secondary-foreground">
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

function EducationSection({ education }: { education: PortfolioData["education"] }) {
  if (education.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<GraduationCap size={20} />}>Education</SectionHeading>
      <div className="space-y-4">
        {education.map((e, i) => (
          <div key={`${e.institution}-${i}`} className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="font-semibold text-foreground">{e.institution}</h3>
              {dateRange(e.start, e.end) && (
                <span className="label">{dateRange(e.start, e.end)}</span>
              )}
            </div>
            {e.degree && <p className="mt-0.5 text-sm text-primary">{e.degree}</p>}
            {e.details && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.details}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PortfolioView({ data }: { data: PortfolioData }) {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 md:py-16">
      <Hero data={data} />
      <ExperienceSection experience={data.experience} />
      <ProjectsSection projects={data.projects} />
      <SkillsSection skills={data.skills} />
      <EducationSection education={data.education} />

      <footer className="flex items-center justify-center gap-1.5 pt-4 text-xs text-muted-foreground">
        Built with
        <Link href="/" className="inline-flex items-center gap-1 text-primary hover:underline">
          CareerPilot <ExternalLink size={11} />
        </Link>
      </footer>
    </div>
  );
}
