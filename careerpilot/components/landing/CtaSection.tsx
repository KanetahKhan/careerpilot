"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function CtaSection() {
  const { user } = useAuth();

  return (
    <section className="sky-cta">
      <h2 className="sky-cta-title">Ready to take off?</h2>
      <Link href={user ? "/hunter" : "/auth?mode=signup"} className="sky-btn sky-btn--xl">
        {user ? "Go to Job Hunter" : "Join CareerPilot Today"}
      </Link>
    </section>
  );
}
