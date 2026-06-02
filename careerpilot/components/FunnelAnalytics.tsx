"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { TrendingUp, Lightbulb } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

type Stages = { applied: number; interview: number; offer: number };
type Rates = { appliedToInterview: number; interviewToOffer: number };
type Insight = {
  metric: string;
  values: { label: string; n: number; rate: number }[];
  takeaway: string;
};

type FunnelResponse = { stages: Stages; rates: Rates; insight: Insight };

const STAGE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export function FunnelAnalytics() {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/funnel")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Failed to load analytics");
        return j as FunnelResponse;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="label">Funnel analytics</p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse-glow">
          Computing your conversion rates…
        </p>
      )}

      {error && <p className="text-sm text-primary">⚠ {error}</p>}

      {!loading && !error && data && <FunnelBody data={data} />}
    </div>
  );
}

function FunnelBody({ data }: { data: FunnelResponse }) {
  const { stages, rates, insight } = data;

  if (stages.applied === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Track a few applications to unlock analytics.
        </p>
      </div>
    );
  }

  const chartData = [
    { name: "Applied", value: stages.applied },
    { name: "Interviewing+", value: stages.interview },
    { name: "Offer", value: stages.offer },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ConversionStat
          from="Applied"
          to="Interview"
          pct={rates.appliedToInterview}
          counts={`${stages.interview} / ${stages.applied}`}
        />
        <ConversionStat
          from="Interview"
          to="Offer"
          pct={rates.interviewToOffer}
          counts={`${stages.offer} / ${stages.interview}`}
        />
      </div>

      <div className="rounded-lg border border-border bg-background/40 p-3">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide allowDecimals={false} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={STAGE_COLORS[i]} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {insight.metric}
            </p>
            <p className="text-sm leading-relaxed text-foreground">{insight.takeaway}</p>
            {insight.values.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {insight.values.map((v) => (
                  <span
                    key={v.label}
                    className="chip bg-secondary text-muted-foreground"
                    title={`${v.n} application${v.n === 1 ? "" : "s"}`}
                  >
                    {v.label}: {v.rate}% ({v.n})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversionStat({
  from,
  to,
  pct,
  counts,
}: {
  from: string;
  to: string;
  pct: number;
  counts: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">
        {from} → {to}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-display text-2xl font-bold text-foreground">{pct}%</p>
        <p className="font-mono text-xs text-muted-foreground">{counts}</p>
      </div>
    </div>
  );
}
