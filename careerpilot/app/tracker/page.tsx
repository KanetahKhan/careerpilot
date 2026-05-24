"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

type App = {
  id: string; role: string; company: string; location: string | null;
  fit_score: number | null; status: string;
};
type Goal = { id: string; title: string; due_date: string | null; done: boolean };

const COLUMNS = [
  { key: "applied", label: "Applied", color: "border-sky/40" },
  { key: "interviewing", label: "Interviewing", color: "border-amber/40" },
  { key: "offer", label: "Offer", color: "border-mint/40" },
  { key: "rejected", label: "Rejected", color: "border-signal/40" },
];
const NEXT: Record<string, string> = {
  applied: "interviewing", interviewing: "offer", offer: "offer", rejected: "applied",
};

export default function TrackerPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  async function load() {
    const [a, g] = await Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ]);
    setApps(a.applications ?? []);
    setGoals(g.goals ?? []);
  }
  useEffect(() => { load(); }, []);

  async function move(app: App) {
    const status = NEXT[app.status] ?? "applied";
    setApps((prev) => prev.map((x) => (x.id === app.id ? { ...x, status } : x)));
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id, status }),
    });
  }

  async function toggleGoal(goal: Goal) {
    setGoals((prev) => prev.map((x) => (x.id === goal.id ? { ...x, done: !x.done } : x)));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, done: !goal.done }),
    });
  }

  const stats = COLUMNS.map((c) => ({
    name: c.label, value: apps.filter((a) => a.status === c.key).length,
  }));
  const barColors = ["#5AA9E6", "#FFB23E", "#3DD9A0", "#FF6B4A"];
  const doneGoals = goals.filter((g) => g.done).length;

  return (
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Pillar 4 · Productivity & Progress</p>
        <h1 className="font-display text-3xl font-bold">Your application command center.</h1>
      </div>

      {/* dashboard strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="label">Applications</p>
          <p className="mt-1 font-display text-4xl font-bold text-signal">{apps.length}</p>
        </div>
        <div className="panel p-5">
          <p className="label">Goals done</p>
          <p className="mt-1 font-display text-4xl font-bold text-mint">
            {doneGoals}<span className="text-chalk-faint text-2xl">/{goals.length}</span>
          </p>
        </div>
        <div className="panel p-3">
          <p className="label px-2">Pipeline</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={stats}>
              <XAxis dataKey="name" tick={{ fill: "#5C6378", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stats.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* kanban */}
      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`panel border-t-2 ${col.color} p-3`}>
            <p className="label mb-3 flex justify-between">
              {col.label}
              <span className="text-chalk-faint">{apps.filter((a) => a.status === col.key).length}</span>
            </p>
            <div className="space-y-2">
              {apps.filter((a) => a.status === col.key).map((a) => (
                <div key={a.id} className="animate-fade-up rounded-xl border border-ink-600 bg-ink-900/50 p-3">
                  <p className="text-sm font-medium text-chalk">{a.role}</p>
                  <p className="text-xs text-chalk-faint">{a.company}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {a.fit_score != null && (
                      <span className="chip bg-ink-700 font-mono text-mint">{a.fit_score} fit</span>
                    )}
                    {col.key !== "offer" && col.key !== "rejected" && (
                      <button onClick={() => move(a)} className="text-xs text-sky hover:text-white">
                        advance →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {apps.filter((a) => a.status === col.key).length === 0 && (
                <p className="py-4 text-center text-xs text-chalk-faint">empty</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* goals */}
      <div className="panel p-5">
        <p className="label mb-3">Goals & to-dos</p>
        <div className="space-y-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGoal(g)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-ink-700/40"
            >
              <span className={`grid h-5 w-5 place-items-center rounded-md border ${g.done ? "border-mint bg-mint/20 text-mint" : "border-ink-500"}`}>
                {g.done && "✓"}
              </span>
              <span className={`text-sm ${g.done ? "text-chalk-faint line-through" : "text-chalk"}`}>{g.title}</span>
              {g.due_date && <span className="ml-auto font-mono text-xs text-chalk-faint">{g.due_date}</span>}
            </button>
          ))}
          {goals.length === 0 && <p className="text-sm text-chalk-faint">No goals yet.</p>}
        </div>
      </div>
    </div>
  );
}
