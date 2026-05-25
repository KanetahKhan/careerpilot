import { GraduationCap, Calendar, Award } from "lucide-react";
import type { CVProfile } from "@/types/cv";

export function EducationTimeline({ education }: { education: CVProfile["education"] }) {
  return (
    <div className="education-section">
      <div className="section-header-row">
        <h2>
          <GraduationCap size={20} />
          Education
        </h2>
      </div>

      <div className="education-timeline">
        {education.map((edu, i) => (
          <div key={edu.id} className="edu-card">
            {i < education.length - 1 && <div className="edu-timeline-line" />}
            <div className="edu-dot" />

            <div className="edu-content">
              <div className="edu-header">
                <div>
                  <h3>{edu.institution}</h3>
                  <p className="edu-degree">{edu.degree}{edu.field ? ` \u2014 ${edu.field}` : ""}</p>
                </div>
                {edu.gpa && (
                  <div className="gpa-badge">
                    <Award size={14} />
                    <span>{edu.gpa}</span>
                    <small>/{edu.gpaScale || "4.00"}</small>
                  </div>
                )}
              </div>

              <div className="edu-meta">
                <span className="edu-year">
                  <Calendar size={13} />
                  {edu.expectedGraduation
                    ? `Expected ${edu.expectedGraduation}`
                    : `${edu.startYear || ""} \u2013 ${edu.endYear || ""}`}
                </span>
                {edu.location && <span className="edu-location">{edu.location}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
