"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalApplication {
  id: string;
  role: string;
  company: string;
  created_at?: string;
}
export interface CalGoal {
  id: string;
  title: string;
  due_date: string | null;
}
interface CalEvent {
  id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  type: string; // deadline | reminder | custom
}

type Item = { kind: "event" | "goal" | "application"; id: string; title: string; type?: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const EVENT_TYPES = ["custom", "deadline", "reminder"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

/** Tailwind classes for a plotted item, keyed by source/type. */
function itemStyle(item: Item): string {
  if (item.kind === "application") return "bg-sky-400/15 text-sky-300";
  if (item.kind === "goal") return "bg-emerald-400/15 text-emerald-300";
  switch (item.type) {
    case "deadline":
      return "bg-rose-400/15 text-rose-300";
    case "reminder":
      return "bg-amber-400/15 text-amber-300";
    default:
      return "bg-primary/15 text-primary";
  }
}

export function Calendar({
  applications,
  goals,
}: {
  applications: CalApplication[];
  goals: CalGoal[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; type: string }>({ title: "", type: "custom" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  // Group every dated item by its YYYY-MM-DD so each cell is a quick lookup.
  const byDate = useMemo(() => {
    const map = new Map<string, Item[]>();
    const push = (date: string | undefined | null, item: Item) => {
      if (!date) return;
      const key = date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    };
    for (const e of events)
      push(e.event_date, { kind: "event", id: e.id, title: e.title, type: e.type });
    for (const g of goals)
      if (g.due_date) push(g.due_date, { kind: "goal", id: g.id, title: `Goal: ${g.title}` });
    for (const a of applications)
      push(a.created_at, { kind: "application", id: a.id, title: `Applied: ${a.role} @ ${a.company}` });
    return map;
  }, [events, goals, applications]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  function openAdd(date: string) {
    setForm({ title: "", type: "custom" });
    setAddDate(date);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !addDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), event_date: addDate, type: form.type }),
      });
      const data = await res.json();
      if (data.event) {
        setEvents((prev) => [...prev, data.event]);
        setAddDate(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="panel p-4 sm:p-5">
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {MONTHS[month]} <span className="text-muted-foreground">{year}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="btn-ghost px-3 py-1.5 text-xs">Today</button>
          <button onClick={goPrev} aria-label="Previous month" className="btn-ghost p-1.5">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goNext} aria-label="Next month" className="btn-ghost p-1.5">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* legend */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="chip bg-sky-400/15 text-sky-300">Applications</span>
        <span className="chip bg-emerald-400/15 text-emerald-300">Goal deadlines</span>
        <span className="chip bg-rose-400/15 text-rose-300">Deadline</span>
        <span className="chip bg-amber-400/15 text-amber-300">Reminder</span>
        <span className="chip bg-primary/15 text-primary">Custom</span>
      </div>

      {/* weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="label py-1 text-center">{d}</div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} className="min-h-[84px]" />;
          const key = toYmd(year, month, day);
          const items = byDate.get(key) ?? [];
          const isToday = key === todayYmd;
          return (
            <button
              key={key}
              onClick={() => openAdd(key)}
              className={cn(
                "min-h-[84px] rounded-lg border border-border bg-secondary/30 p-1.5 text-left align-top transition-colors hover:border-primary/40 hover:bg-primary/5",
                isToday && "border-primary/60 ring-1 ring-primary/30"
              )}
            >
              <span className={cn("font-mono text-xs", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    title={item.title}
                    className={cn("flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight", itemStyle(item))}
                  >
                    <span className="truncate">{item.title}</span>
                    {item.kind === "event" && (
                      <span
                        role="button"
                        aria-label="Delete event"
                        onClick={(e) => { e.stopPropagation(); removeEvent(item.id); }}
                        className="ml-auto shrink-0 opacity-60 hover:opacity-100"
                      >
                        <X size={10} />
                      </span>
                    )}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Click any day to add a deadline or reminder.
      </p>

      {/* add-event modal */}
      {addDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAddDate(null)}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add event</h3>
              <button onClick={() => setAddDate(null)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="label mb-4">{addDate}</p>
            <form onSubmit={saveEvent} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Google application deadline"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setAddDate(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "Saving…" : "Add event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
