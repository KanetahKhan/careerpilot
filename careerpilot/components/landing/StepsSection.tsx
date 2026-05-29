import { FileUp, LineChart, Map, BadgeCheck, CloudUpload } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: FileUp,
    title: "Upload your CV",
    desc: "Our parser extracts skills, experience, and education in seconds. No manual forms needed.",
  },
  {
    num: "02",
    icon: LineChart,
    title: "AI analyzes profile",
    desc: "We map your strengths against thousands of live job postings to find perfect matches.",
  },
  {
    num: "03",
    icon: Map,
    title: "Get a roadmap",
    desc: "Skill gaps, interview prep, and application strategy tailored to your target roles.",
  },
  {
    num: "04",
    icon: BadgeCheck,
    title: "Track & land",
    desc: "Kanban pipeline, deadline reminders, and coach check-ins until you sign the offer.",
  },
];

export function StepsSection() {
  return (
    <section className="sky-section sky-how" id="how-it-works">
      <div className="sky-how-head">
        <div>
          <h2 className="sky-section-title" style={{ textAlign: "left" }}>
            How it works
          </h2>
          <p style={{ color: "var(--sky-on-surface-variant)", fontSize: 18, margin: 0 }}>
            From CV to offer letter in four simple steps
          </p>
        </div>
        <CloudUpload size={56} style={{ color: "var(--sky-primary)", flexShrink: 0 }} className="hidden lg:block" />
      </div>

      <div className="sky-steps">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.num} className="sky-step">
              <span className="sky-step-num">{s.num}</span>
              <div className="sky-step-card">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="sky-step-foot">
                  <Icon size={32} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
