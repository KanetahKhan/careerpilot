"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const LINKS = [
  { href: "/profile", label: "CV Brain" },
  { href: "/hunter", label: "Job Hunter" },
  { href: "/assistant", label: "AI Coach" },
  { href: "/tracker", label: "Tracker" },
];

export function Navbar() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`sky-nav${scrolled ? " scrolled" : ""}`}>
      <div className="sky-nav-inner">
        <Link href="/" className="sky-logo">
          CareerPilot
        </Link>

        <div className="sky-nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="sky-nav-link">
              {l.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="sky-nav-skeleton" />
        ) : (
          <Link href={user ? "/hunter" : "/auth"} className="sky-btn sky-btn--nav">
            {user ? "Dashboard" : "Sign Up/Sign In"}
          </Link>
        )}
      </div>
    </nav>
  );
}
