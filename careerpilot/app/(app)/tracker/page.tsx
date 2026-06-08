"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { Plus, Briefcase, BarChart3, LayoutDashboard } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { AddApplicationButton } from "@/components/AddApplicationButton";
import { Calendar } from "@/components/Calendar";
import { Nudges } from "@/components/Nudges";
import { FunnelAnalytics } from "@/components/FunnelAnalytics";
import { ProgressRing } from "@/components/ProgressRing";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  role: string;
  company: string;
  location?: string;
  fit_score?: number;
  status: string;
  link?: string;
  created_at?: string;
}

interface Goal {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
}

const COLUMNS: { id: string; label: string }[] = [
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

const BAR_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const KanbanCard = memo(function KanbanCard({
  provided,
  snapshot,
  app,
}: {
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  app: Application;
}) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      aria-label={`${app.role} at ${app.company}${app.fit_score != null ? `, fit score ${app.fit_score}%` : ""}`}
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-sm transition-all",
        snapshot.isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1"
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-medium text-sm text-foreground line-clamp-1">
          {app.role}
        </h3>
        {app.fit_score !== undefined && app.fit_score !== null && (
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded font-medium",
              app.fit_score >= 75
                ? "bg-primary/10 text-primary"
                : app.fit_score >= 55
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {app.fit_score}%
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{app.company}</p>
      {app.location && (
        <p className="text-xs text-muted-foreground mt-0.5">{app.location}</p>
      )}
    </div>
  );
});

export default function TrackerPage() {
  const { user } = useAuth();
  const rawName = (
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "there"
  ).trim();
  const firstName = rawName.split(/\s+/)[0];
  const greetName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const [apps, setApps] = useState<Application[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [roadmapStat, setRoadmapStat] = useState<{ percent: number; done: number; total: number } | null>(null);

  async function load() {
    const [a, g, r] = await Promise.allSettled([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/roadmap/progress", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (a.status === "fulfilled") setApps(a.value.applications ?? []);
    if (g.status === "fulfilled") setGoals(g.value.goals ?? []);
    if (r.status === "fulfilled" && r.value?.roadmap && r.value?.progress) {
      setRoadmapStat(r.value.progress);
    } else if (r.status === "rejected" || (r.status === "fulfilled" && !r.value?.roadmap)) {
      setRoadmapStat({ percent: 0, done: 0, total: 0 });
    }

    if (a.status === "rejected") setLoadError("Failed to load applications");
    setIsLoading(false);
  }
  useEffect(() => { load(); }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    const appId = result.draggableId;

    if (sourceCol === destCol) return;

    // Optimistic update
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: destCol } : app
      )
    );

    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: destCol }),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch {
      // Roll back on failure
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: sourceCol } : app
        )
      );
    }
  }, []);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalDue, setGoalDue] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const goalInput = useRef<HTMLInputElement>(null);

  async function toggleGoal(goal: Goal) {
    setGoals((prev) => prev.map((x) => (x.id === goal.id ? { ...x, done: !x.done } : x)));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, done: !goal.done }),
    });
  }

  async function addGoal() {
    const title = goalTitle.trim();
    if (!title) return;
    setAddingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, due_date: goalDue || null }),
      });
      const data = await res.json();
      if (data.goal) {
        setGoals((prev) => [...prev, data.goal]);
        setGoalTitle("");
        setGoalDue("");
        goalInput.current?.focus();
      }
    } finally {
      setAddingGoal(false);
    }
  }

  const getAppsByStatus = useCallback(
    (status: string) => apps.filter((app) => app.status === status),
    [apps]
  );

  const stats = useMemo(
    () => COLUMNS.map((c) => ({ name: c.label, value: getAppsByStatus(c.id).length })),
    [getAppsByStatus]
  );
  const doneGoals = useMemo(() => goals.filter((g) => g.done).length, [goals]);

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
        {loadError && (
          <p className="text-sm text-destructive">⚠ {loadError} — data may be incomplete</p>
        )}
      <PageHeader
        eyebrow="Pillar 4 · Productivity & Progress"
        title="Your application command center."
        subtitle="Here is your job-search snapshot — keep the momentum going."
        icon={LayoutDashboard}
      >
        <AddApplicationButton onAdd={(app) => setApps((prev) => [...prev, app])} />
      </PageHeader>

      {/* dashboard strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Briefcase size={18} />
            </span>
            <p className="label">Applications</p>
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-primary">{apps.length}</p>
        </div>
        <div className="panel flex items-center gap-4 p-5">
          <ProgressRing
            value={goals.length ? (doneGoals / goals.length) * 100 : 0}
            color="hsl(160 84% 45%)"
            center={goals.length ? `${doneGoals}/${goals.length}` : "—"}
          />
          <div>
            <p className="label">Goals done</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {goals.length ? `${doneGoals} of ${goals.length} complete` : "No goals yet"}
            </p>
          </div>
        </div>
        <div className="panel flex items-center gap-4 p-5">
          <ProgressRing
            value={roadmapStat?.percent ?? 0}
            color="hsl(199 89% 58%)"
            center={roadmapStat === null ? "…" : roadmapStat.total === 0 ? "—" : `${roadmapStat.percent}%`}
          />
          <div>
            <p className="label">Roadmap</p>
            {roadmapStat === null ? (
              <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
            ) : roadmapStat.total === 0 ? (
              <a href="/roadmap" className="mt-1 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Build a roadmap →
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {roadmapStat.done}/{roadmapStat.total} actions done
              </p>
            )}
          </div>
        </div>
        <div className="panel p-3">
          <div className="flex items-center gap-2 px-2 pt-1">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground">
              <BarChart3 size={16} />
            </span>
            <p className="label">Pipeline</p>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={stats}>
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stats.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* view toggle: Kanban board vs month calendar */}
      <div role="group" aria-label="View mode" className="inline-flex rounded-xl border border-border bg-secondary/30 p-1 text-sm">
        <button
          onClick={() => setView("board")}
          aria-pressed={view === "board"}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition-colors",
            view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Board
        </button>
        <button
          onClick={() => setView("calendar")}
          aria-pressed={view === "calendar"}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition-colors",
            view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Calendar
        </button>
      </div>

      {view === "calendar" && <Calendar applications={apps} goals={goals} />}

      {view === "board" && (
        <>
      {/* Kanban with Drag-and-Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  {col.label}
                </h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {getAppsByStatus(col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label={`${col.label} — ${getAppsByStatus(col.id).length} ${getAppsByStatus(col.id).length === 1 ? "application" : "applications"}`}
                    className={cn(
                      "flex-1 rounded-lg border border-border bg-secondary/30 p-2 space-y-2 transition-colors min-h-[120px]",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/20"
                    )}
                  >
                    {getAppsByStatus(col.id).length === 0 && !snapshot.isDraggingOver && (
                      <p className="py-4 text-center text-xs text-muted-foreground">empty</p>
                    )}
                    {getAppsByStatus(col.id).map((app, index) => (
                      <Draggable key={app.id} draggableId={app.id} index={index}>
                        {(provided, snapshot) => (
                          <KanbanCard
                            provided={provided}
                            snapshot={snapshot}
                            app={app}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* goals */}
      <div className="panel p-5">
        <p className="label mb-3">Goals & to-dos</p>

        <div className="mb-3 flex items-center gap-2">
          <input
            ref={goalInput}
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
            placeholder="Add a goal…"
            aria-label="Goal title"
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="date"
            value={goalDue}
            onChange={(e) => setGoalDue(e.target.value)}
            aria-label="Due date"
            className="w-36 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={addGoal}
            disabled={addingGoal || !goalTitle.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Plus size={16} /> {addingGoal ? "Adding…" : "Add"}
          </button>
        </div>

        <div className="space-y-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGoal(g)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-secondary/40"
            >
              <span className={`grid h-5 w-5 place-items-center rounded-md border ${g.done ? "border-primary bg-primary/20 text-primary" : "border-border"}`}>
                {g.done && "✓"}
              </span>
              <span className={`text-sm ${g.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{g.title}</span>
              {g.due_date && <span className="ml-auto font-mono text-xs text-muted-foreground">{g.due_date}</span>}
            </button>
          ))}
          {goals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
        </div>
      </div>

      {/* Funnel analytics — deterministic conversion rates + one computed insight */}
      <FunnelAnalytics />

      {/* AI nudges — proactive, data-grounded reminders */}
      <Nudges />
        </>
      )}
    </div>
    </FadeIn>
  );
}
