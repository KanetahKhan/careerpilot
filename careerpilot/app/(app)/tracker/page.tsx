"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { FadeIn } from "@/components/FadeIn";
import { AddApplicationButton } from "@/components/AddApplicationButton";
import { Calendar } from "@/components/Calendar";
import { Nudges } from "@/components/Nudges";
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

const BAR_COLORS = ["#5AA9E6", "#FFB23E", "#3DD9A0", "#a78bfa"];

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"board" | "calendar">("board");

  async function load() {
    const [a, g] = await Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ]);
    setApps(a.applications ?? []);
    setGoals(g.goals ?? []);
    setIsLoading(false);
  }
  useEffect(() => { load(); }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    const appId = result.draggableId;

    if (sourceCol === destCol) return;

    setApps((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: destCol } : app
      )
    );

    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: appId, status: destCol }),
    });
  };

  async function toggleGoal(goal: Goal) {
    setGoals((prev) => prev.map((x) => (x.id === goal.id ? { ...x, done: !x.done } : x)));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, done: !goal.done }),
    });
  }

  const getAppsByStatus = (status: string) =>
    apps.filter((app) => app.status === status);

  const stats = COLUMNS.map((c) => ({
    name: c.label,
    value: getAppsByStatus(c.id).length,
  }));
  const doneGoals = goals.filter((g) => g.done).length;

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="label mb-2">Pillar 4 · Productivity & Progress</p>
          <h1 className="font-display text-3xl font-bold">Your application command center.</h1>
        </div>
        <AddApplicationButton onAdd={(app) => setApps((prev) => [...prev, app])} />
      </div>

      {/* dashboard strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="label">Applications</p>
          <p className="mt-1 font-display text-4xl font-bold text-primary">{apps.length}</p>
        </div>
        <div className="panel p-5">
          <p className="label">Goals done</p>
          <p className="mt-1 font-display text-4xl font-bold text-emerald-400">
            {doneGoals}<span className="text-muted-foreground text-2xl">/{goals.length}</span>
          </p>
        </div>
        <div className="panel p-3">
          <p className="label px-2">Pipeline</p>
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
      <div className="inline-flex rounded-xl border border-border bg-secondary/30 p-1 text-sm">
        <button
          onClick={() => setView("board")}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition-colors",
            view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Board
        </button>
        <button
          onClick={() => setView("calendar")}
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
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
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
                                      ? "bg-emerald-400/10 text-emerald-400"
                                      : app.fit_score >= 55
                                      ? "bg-amber-400/10 text-amber-400"
                                      : "bg-rose-400/10 text-rose-400"
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
        <div className="space-y-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGoal(g)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-secondary/40"
            >
              <span className={`grid h-5 w-5 place-items-center rounded-md border ${g.done ? "border-emerald-400 bg-emerald-400/20 text-emerald-400" : "border-border"}`}>
                {g.done && "✓"}
              </span>
              <span className={`text-sm ${g.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{g.title}</span>
              {g.due_date && <span className="ml-auto font-mono text-xs text-muted-foreground">{g.due_date}</span>}
            </button>
          ))}
          {goals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
        </div>
      </div>

      {/* AI nudges — proactive, data-grounded reminders */}
      <Nudges />
        </>
      )}
    </div>
    </FadeIn>
  );
}
