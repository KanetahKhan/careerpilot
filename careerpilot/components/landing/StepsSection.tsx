"use client";

import { useEffect, useRef } from "react";
import { Upload, Brain, Target, Trophy } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Upload your CV",
    desc: "Our parser extracts skills, experience, and education in seconds. No manual forms.",
  },
  {
    num: "02",
    icon: Brain,
    title: "AI analyzes your profile",
    desc: "We map your strengths against thousands of live job postings to find perfect matches.",
  },
  {
    num: "03",
    icon: Target,
    title: "Get a personalized roadmap",
    desc: "Skill gaps, interview prep, and application strategy tailored to your target roles.",
  },
  {
    num: "04",
    icon: Trophy,
    title: "Track & land the offer",
    desc: "Kanban pipeline, deadline reminders, and coach check-ins until you sign.",
  },
];

export function StepsSection() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("step-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cardsRef.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="steps-section">
      <div className="section-header">
        <h2 className="section-title">How it works</h2>
        <p className="section-subtitle">From CV to offer letter in four simple steps</p>
      </div>

      <div className="steps-grid">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="step-card"
              style={{ "--delay": `${i * 120}ms` } as React.CSSProperties}
            >
              <div className="step-num">{step.num}</div>
              <div className="step-icon">
                <Icon size={20} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
