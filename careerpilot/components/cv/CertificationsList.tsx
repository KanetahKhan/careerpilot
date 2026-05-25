import { Trophy, Calendar } from "lucide-react";
import type { CVProfile } from "@/types/cv";

export function CertificationsList({ certifications }: { certifications: CVProfile["certifications"] }) {
  if (certifications.length === 0) return null;

  return (
    <div className="certifications-section">
      <div className="section-header-row">
        <h2>
          <Trophy size={20} />
          Achievements &amp; Certifications
        </h2>
      </div>

      <div className="certs-grid">
        {certifications.map((cert) => (
          <div key={cert.id} className="cert-card">
            <div className="cert-icon">
              <Trophy size={20} />
            </div>
            <div className="cert-content">
              <h4>{cert.title}</h4>
              {cert.issuer && <p className="cert-issuer">{cert.issuer}</p>}
              <div className="cert-meta">
                <span><Calendar size={12} /> {cert.year}</span>
                {cert.rank && <span className="cert-rank">{cert.rank}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
