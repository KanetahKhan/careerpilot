import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <span>CareerPilot</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 border-t border-border text-center text-sm text-muted-foreground">
        <p>CareerPilot — Your Agentic Career Co-pilot</p>
      </footer>
    </div>
  );
}
