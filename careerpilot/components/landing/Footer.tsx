import Link from "next/link";

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">&#10024; CareerPilot</span>
          <p>AI-powered career navigation for modern job seekers.</p>
        </div>

        <div className="footer-links">
          <div className="link-col">
            <h4>Product</h4>
            <Link href="/profile">CV Brain</Link>
            <Link href="/hunter">Job Hunter</Link>
            <Link href="/assistant">AI Coach</Link>
            <Link href="/tracker">Tracker</Link>
          </div>
          <div className="link-col">
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/careers">Careers</Link>
          </div>
          <div className="link-col">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 CareerPilot. Built for CodeSprint.</p>
      </div>
    </footer>
  );
}
