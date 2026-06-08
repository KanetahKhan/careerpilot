"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FitScoreRing } from "@/components/dashboard/FitScoreRing";
import { useAuth } from "@/components/AuthProvider";
import { FadeIn } from "@/components/FadeIn";
import {
  FileText, Target, Calendar, Flame, Building2, Inbox, Sparkles,
  Lightbulb, Search, Upload, MessageSquare, BarChart3, Rocket,
} from "lucide-react";

type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
  fit_score?: number;
  created_at?: string;
};

type Event = {
  id: string;
  title: string;
  event_date: string;
  type: string;
};

type Nudge = {
  id: string;
  message: string;
  type: string;
  read: boolean;
  action?: { type: string; query?: string };
  actionUrl?: string;
  actionLabel?: string;
};

type Profile = {
  fullName?: string;
  jobTitle?: string;
  location?: string;
  email?: string;
  avatarUrl?: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [remainingItems, setRemainingItems] = useState(0);
  const [completionHint, setCompletionHint] = useState("");
  const [streak, setStreak] = useState(0);

  const rawName = (
    user?.user_metadata?.full_name as string | undefined ||
    user?.email?.split("@")[0] ||
    "there"
  ).trim();
  const firstName = rawName.split(/\s+/)[0];
  const greetName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [appsRes, eventsRes, nudgesRes, profileRes] = await Promise.all([
          fetch("/api/applications").then(r => r.json()),
          fetch("/api/events").then(r => r.ok ? r.json() : { events: [] }),
          fetch("/api/nudges").then(r => r.ok ? r.json() : { notifications: [] }),
          fetch("/api/cv/profile").then(r => r.ok ? r.json() : { totalChunks: 0 }),
        ]);

        if (cancelled) return;

        const appList: Application[] = appsRes.applications ?? [];
        setApplications(appList.slice(0, 5));
        setEvents(eventsRes.events ?? []);

        const notifs: Nudge[] = nudgesRes.notifications ?? [];
        setNudges(notifs.slice(0, 3));

        const profileData = profileRes;
        const totalChunks = profileData.totalChunks ?? 0;
        const sections = profileData.sections ?? [];

        if (totalChunks > 0) {
          setProfile({ fullName: user?.user_metadata?.full_name as string });
          setCompletionPercentage(100);
          setCompletionHint("Your CV is ready");
          setRemainingItems(0);
        } else {
          setProfile(null);
          setCompletionPercentage(0);
          setCompletionHint("Upload your CV to get started");
          setRemainingItems(1);
        }

        setStreak(Math.min(appList.filter(a => {
          if (!a.created_at) return false;
          const d = new Date(a.created_at);
          const now = new Date();
          return d >= new Date(now.getTime() - 7 * 86400000);
        }).length, 7));
      } catch {
        // silently handle errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const interviewCount = applications.filter(a => a.status === "interviewing").length;
  const thisWeekCount = events.filter(e => {
    const d = new Date(e.event_date);
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    return d >= now && d <= weekEnd;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-32 w-full rounded-3xl bg-muted/50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl bg-muted/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-3xl bg-muted/50" />
            <Skeleton className="h-40 rounded-3xl bg-muted/50" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-3xl bg-muted/50" />
            <Skeleton className="h-40 rounded-3xl bg-muted/50" />
            <Skeleton className="h-44 rounded-3xl bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
    <div className="space-y-6 pb-8">

      <section>
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "hsl(var(--primary) / 0.3)" }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Hi, {greetName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Ready to land your next role?
              </p>
              <p className="text-sm text-muted-foreground/70 mt-0.5">
                Here&apos;s what&apos;s happening with your job search
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            label="Applications"
            value={applications.length}
            change="See all"
            changeType="neutral"
          />
          <StatCard
            icon={Target}
            label="Interviews"
            value={interviewCount}
            change={interviewCount > 0 ? `${interviewCount} active` : "No interviews yet"}
            changeType={interviewCount > 0 ? "positive" : "neutral"}
          />
          <StatCard
            icon={Calendar}
            label="This Week"
            value={thisWeekCount}
            subtitle="deadlines"
          />
          <StatCard
            icon={Flame}
            label="Streak"
            value={`${streak}d`}
            subtitle={streak > 0 ? "Keep it up!" : "Start applying today"}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="panel p-6">
            <div className="pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Recent Applications</h3>
              <p className="text-sm text-muted-foreground">Your latest job applications</p>
            </div>
            {applications.length > 0 ? (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{app.company}</p>
                        <p className="text-sm text-muted-foreground">{app.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} />
                      {app.fit_score !== undefined && app.fit_score !== null && (
                        <FitScoreRing score={app.fit_score} />
                      )}
                    </div>
                  </div>
                ))}
                <Link
                  href="/tracker"
                  className="btn-ghost w-full mt-2 justify-center"
                >
                  View All Applications &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium text-foreground">No applications yet</h3>
                <p className="mb-4 max-w-[250px] text-sm text-muted-foreground">Start hunting for your dream job</p>
                <Link href="/hunter" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
                  Hunt Jobs &rarr;
                </Link>
              </div>
            )}
          </div>

          <div className="panel p-6">
            <div className="pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
              </h3>
            </div>
            {nudges.length > 0 ? (
              <div className="space-y-3">
                {nudges.map((nudge) => (
                  <div
                    key={nudge.id}
                    className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3"
                  >
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm text-foreground">{nudge.message}</p>
                      {nudge.action?.query && (
                        <Link
                          href={`/hunter?q=${encodeURIComponent(nudge.action.query)}`}
                          className="inline-flex h-auto items-center p-0 text-sm text-primary hover:underline"
                        >
                          Take action &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium text-foreground">No insights yet</h3>
                <p className="mb-4 max-w-[250px] text-sm text-muted-foreground">Complete your profile to get personalized recommendations</p>
                <Link href="/profile" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
                  Complete Profile
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton icon={Search} label="Search Jobs" href="/hunter" color="primary" />
              <QuickActionButton icon={Upload} label="Upload CV" href="/profile/edit" />
              <QuickActionButton icon={MessageSquare} label="AI Coach" href="/assistant" />
              <QuickActionButton icon={BarChart3} label="Tracker" href="/tracker" />
            </div>
          </div>

          <div className="panel p-6">
            <div className="pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming
              </h3>
            </div>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.event_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium text-foreground">No upcoming events</h3>
                <p className="mb-4 max-w-[250px] text-sm text-muted-foreground">Add deadlines to stay on track</p>
                <Link href="/tracker" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium">
                  Go to Tracker
                </Link>
              </div>
            )}
          </div>

          <div className="panel p-6">
            <div className="pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Profile Completion</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{completionPercentage}% complete</span>
                <span className="text-muted-foreground">{remainingItems} items left</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              {completionPercentage < 100 && (
                <p className="text-sm text-muted-foreground">{completionHint}</p>
              )}
              <Link
                href="/profile/edit"
                className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                {completionPercentage === 100 ? "View Profile" : "Complete Profile →"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
    </FadeIn>
  );
}
