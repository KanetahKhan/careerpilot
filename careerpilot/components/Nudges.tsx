"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type HunterSearchAction = { type: "hunter_search"; query: string };
type NudgeAction = HunterSearchAction | null;

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action?: NudgeAction;
}

const TYPE_STYLE: Record<string, string> = {
  apply: "bg-sky-400/15 text-sky-300",
  goal: "bg-emerald-400/15 text-emerald-300",
  skill: "bg-amber-400/15 text-amber-300",
  general: "bg-primary/15 text-primary",
};

function isHunterAction(action: unknown): action is HunterSearchAction {
  return (
    !!action &&
    typeof action === "object" &&
    (action as { type?: unknown }).type === "hunter_search" &&
    typeof (action as { query?: unknown }).query === "string" &&
    ((action as { query: string }).query.trim().length > 0)
  );
}

export function Nudges() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/nudges")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch("/api/nudges", { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Could not generate nudges — please try again.");
        return;
      }
      setItems((prev) => [...(d.notifications ?? []), ...prev]);
    } catch {
      setError("Could not generate nudges — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function markRead(n: Notification) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await fetch("/api/nudges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, read: true }),
    });
  }

  function runHunter(n: Notification, query: string) {
    // Best-effort mark-read; navigation happens regardless.
    markRead(n);
    router.push(`/hunter?q=${encodeURIComponent(query)}`);
  }

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="label">AI Nudges</p>
          {unread > 0 && <span className="chip bg-primary/15 text-primary">{unread} new</span>}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          <Sparkles size={14} /> {generating ? "Thinking…" : "Generate today's nudges"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-amber-400">{error}</p>}

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No nudges yet. Click <span className="text-foreground">Generate today&apos;s nudges</span> for
            proactive, data-grounded reminders based on your applications and goals.
          </p>
        )}
        {items.map((n) => {
          const action = isHunterAction(n.action) ? n.action : null;
          return (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors",
                !n.read && "bg-secondary/20"
              )}
            >
              <button
                type="button"
                onClick={() => markRead(n)}
                title={n.read ? "Read" : "Mark as read"}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <span className={cn("chip mt-0.5 shrink-0", TYPE_STYLE[n.type] ?? TYPE_STYLE.general)}>
                  {n.type}
                </span>
                <span className={cn("flex-1 text-sm leading-relaxed", n.read ? "text-muted-foreground" : "text-foreground")}>
                  {n.message}
                </span>
              </button>

              {action && (
                <button
                  type="button"
                  onClick={() => runHunter(n, action.query)}
                  className="btn-primary shrink-0 whitespace-nowrap px-3 py-1.5 text-xs"
                  title={`Search Hunter: "${action.query}"`}
                >
                  <Search size={12} />
                  Search now
                </button>
              )}

              {n.read ? (
                <Check size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="unread" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
