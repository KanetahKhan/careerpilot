import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="cta-section">
      <div className="cta-card">
        <h2>Ready to pilot your career?</h2>
        <p>Upload your CV and let AI find your next opportunity.</p>
        <Link href="/auth?mode=signup" className="cta-btn">
          Get Started Free
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
