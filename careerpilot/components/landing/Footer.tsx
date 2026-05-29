import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="sky-footer">
      <div className="sky-footer-grid">
        <div className="sky-footer-brand">
          <span className="sky-footer-brand-name">
            <Sparkles size={18} /> CareerPilot
          </span>
          <p>AI-powered career navigation for modern job seekers. Navigation for the whimsical soul.</p>
        </div>

        <div className="sky-footer-col">
          <h4>Product</h4>
          <Link href="/profile">CV Brain</Link>
          <Link href="/hunter">Job Hunter</Link>
          <Link href="/assistant">AI Coach</Link>
        </div>

        <div className="sky-footer-col">
          <h4>Company</h4>
          <Link href="/">About</Link>
          <Link href="/">Privacy</Link>
          <Link href="/">Terms</Link>
        </div>

        <div className="sky-footer-col">
          <h4>Newsletter</h4>
          <div className="sky-news">
            <input type="email" placeholder="Email address" aria-label="Email address" />
            <button type="button" aria-label="Subscribe">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="sky-footer-bottom">© 2026 CareerPilot AI. All rights reserved.</div>
    </footer>
  );
}
