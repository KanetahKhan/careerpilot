import { ExternalLink, Star, Code2 } from "lucide-react";
import type { CVProfile } from "@/types/cv";

const GitHubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const TECH_COLORS: Record<string, string> = {
  "C++": "#00599c",
  Java: "#b07219",
  Swing: "#e76f00",
  OOP: "#2563eb",
  Minimax: "#7c3aed",
  "Console App": "#64748b",
  "File-Based Storage": "#059669",
  Python: "#3776AB",
  SQL: "#e38c00",
  Git: "#f05032",
  GitHub: "#181717",
};

export function ProjectsGrid({ projects }: { projects: CVProfile["projects"] }) {
  return (
    <div className="projects-section">
      <div className="section-header-row">
        <h2>
          <Code2 size={20} />
          Projects
        </h2>
        <button className="add-project-btn">+ Add Project</button>
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-top">
              <div className="project-title-row">
                <h3>{project.name}</h3>
                {project.featured && (
                  <span className="featured-badge">
                    <Star size={12} fill="currentColor" /> Featured
                  </span>
                )}
              </div>

              <div className="tech-stack">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="tech-badge"
                    style={{
                      background: `${TECH_COLORS[tech] || "#64748b"}12`,
                      color: TECH_COLORS[tech] || "#64748b",
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <p className="project-desc">{project.description}</p>

              {project.bullets && project.bullets.length > 0 && (
                <ul className="project-highlights">
                  {project.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="project-links">
              {project.githubUrl ? (
                <a href={project.githubUrl} target="_blank" rel="noreferrer" className="project-link github">
                  <GitHubIcon /> View Code
                </a>
              ) : (
                <span className="project-link disabled">
                  <GitHubIcon /> Add GitHub
                </span>
              )}

              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="project-link live">
                  <ExternalLink size={15} /> Live Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
