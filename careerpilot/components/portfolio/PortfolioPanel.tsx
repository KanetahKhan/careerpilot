"use client";
import { useEffect, useState } from "react";
import { Globe, Copy, ExternalLink, Check, Sparkles, Eye, EyeOff, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type PortfolioState = { slug: string; published: boolean; url: string } | null;

export function PortfolioPanel({ hasCv }: { hasCv: boolean }) {
  const [portfolio, setPortfolio] = useState<PortfolioState>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"generate" | "toggle" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [includeContact, setIncludeContact] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((j) => setPortfolio(j?.portfolio ?? null))
      .catch(() => setPortfolio(null))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setBusy("generate");
    setError(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ includeContact }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Failed to generate portfolio");
      setPortfolio({ slug: j.slug, url: j.url, published: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function togglePublished() {
    if (!portfolio) return;
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: !portfolio.published }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Failed to update portfolio");
      setPortfolio((p) => (p ? { ...p, published: j.published } : p));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!portfolio) return;
    try {
      await navigator.clipboard.writeText(portfolio.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked — the URL is still visible to copy manually */
    }
  }

  if (loading) return null;

  if (!hasCv) {
    return (
      <div className="panel p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Public portfolio</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload or build a CV first — your portfolio is generated from it.
        </p>
        <Link href="/onboarding" className="mt-4 inline-flex">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" /> Upload your CV
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Public portfolio</h2>
            {portfolio && (
              <span
                className={`chip border ${
                  portfolio.published
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {portfolio.published ? "Published" : "Unpublished"}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            A clean, shareable page built from your CV — viewable by anyone, no login required.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button onClick={generate} disabled={busy !== null} pending={busy === "generate"}>
            <Sparkles className="h-4 w-4" />
            {portfolio ? "Update portfolio" : "Generate portfolio"}
          </Button>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeContact}
              onChange={(e) => setIncludeContact(e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            Include contact info
          </label>
        </div>
      </div>

      {portfolio && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
              {portfolio.url}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={portfolio.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          </div>

          <button
            type="button"
            onClick={togglePublished}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {portfolio.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {busy === "toggle"
              ? "Updating…"
              : portfolio.published
                ? "Unpublish (hide from public)"
                : "Publish (make public)"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
