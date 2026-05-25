import type { CVProfile } from "@/types/cv";

export function SkillsCloud({ skills }: { skills: CVProfile["skills"] }) {
  return (
    <div className="skills-card">
      <div className="skills-header">
        <h2>Skills &amp; Expertise</h2>
        <button className="add-skill-btn">+ Add</button>
      </div>

      {skills.map((group) => (
        <div key={group.category} className="skill-group">
          <h3 className="skill-category" style={{ color: group.color }}>
            {group.category}
          </h3>
          <div className="skill-chips">
            {group.items.map((skill) => (
              <span
                key={skill}
                className="skill-chip"
                style={{
                  background: `${group.color}10`,
                  color: group.color,
                  borderColor: `${group.color}25`,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
