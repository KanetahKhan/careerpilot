import { Users } from "lucide-react";
import type { CVProfile } from "@/types/cv";

export function ExtracurricularCard({ extracurricular }: { extracurricular: CVProfile["extracurricular"] }) {
  if (extracurricular.length === 0) return null;

  return (
    <div className="extra-section">
      <div className="section-header-row">
        <h2>
          <Users size={20} />
          Leadership &amp; Activities
        </h2>
      </div>

      <div className="extra-list">
        {extracurricular.map((item, i) => (
          <div key={i} className="extra-item">
            <div className="extra-org">{item.organization}</div>
            <div className="extra-role">{item.role}</div>
            {item.activities.length > 0 && (
              <ul className="extra-activities">
                {item.activities.map((act, j) => (
                  <li key={j}>{act}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
