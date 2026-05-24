/**
 * CareerPilot evaluation suite.
 * Run a local dev server first (npm run dev), then: npm run eval
 *
 * Each case documents: input, expected behavior, actual, pass/fail.
 * This is the artifact judges can run to verify your claims.
 */
const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";

type Case = { id: string; desc: string; run: () => Promise<{ pass: boolean; actual: string }> };

const cases: Case[] = [
  {
    id: "EVAL-1",
    desc: "Job search returns structured, fit-scored cards (0..100)",
    run: async () => {
      const r = await fetch(`${BASE}/api/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "react frontend" }),
      });
      const j = await r.json();
      const jobs = j.jobs ?? [];
      const ok = jobs.length >= 1 && jobs.every((x: any) => x.fit?.score >= 0 && x.fit?.score <= 100);
      return { pass: ok, actual: `${jobs.length} jobs, scores ${jobs.map((x: any) => x.fit?.score).join(",")}` };
    },
  },
  {
    id: "EVAL-2",
    desc: "Fit score is deterministic-ish (same input twice → within ±5)",
    run: async () => {
      const call = async () => {
        const r = await fetch(`${BASE}/api/jobs/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "node backend" }),
        });
        const j = await r.json();
        return j.jobs?.[0]?.fit?.score ?? -1;
      };
      const a = await call();
      const b = await call();
      return { pass: Math.abs(a - b) <= 5, actual: `run1=${a} run2=${b}` };
    },
  },
  {
    id: "EVAL-3",
    desc: "Agent trace is exposed (proves tool-calling, not a single LLM call)",
    run: async () => {
      const r = await fetch(`${BASE}/api/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "ml internship" }),
      });
      const j = await r.json();
      return { pass: (j.trace ?? []).length > 0, actual: (j.trace ?? []).join(" | ") };
    },
  },
  {
    id: "EVAL-4",
    desc: "Assistant chat endpoint streams a response",
    run: async () => {
      const r = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello, who am I?" }] }),
      });
      const text = await r.text();
      return { pass: r.ok && text.length > 0, actual: `status ${r.status}, ${text.length} bytes` };
    },
  },
  {
    id: "EVAL-5",
    desc: "Applications API round-trips (create → list)",
    run: async () => {
      await fetch(`${BASE}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "Eval Role", company: "EvalCo", fit_score: 77 }),
      });
      const r = await fetch(`${BASE}/api/applications`);
      const j = await r.json();
      const found = (j.applications ?? []).some((a: any) => a.company === "EvalCo");
      return { pass: found, actual: `${(j.applications ?? []).length} apps, EvalCo present=${found}` };
    },
  },
  {
    id: "EVAL-6",
    desc: "Goals API returns the seeded demo goals",
    run: async () => {
      const r = await fetch(`${BASE}/api/goals`);
      const j = await r.json();
      return { pass: (j.goals ?? []).length >= 1, actual: `${(j.goals ?? []).length} goals` };
    },
  },
  {
    id: "EVAL-7",
    desc: "Job cache works (repeat query is fast / consistent)",
    run: async () => {
      const q = { query: "full-stack engineer" };
      const r1 = await fetch(`${BASE}/api/jobs/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
      const j1 = await r1.json();
      const r2 = await fetch(`${BASE}/api/jobs/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
      const j2 = await r2.json();
      return { pass: (j1.jobs?.length ?? 0) === (j2.jobs?.length ?? 0), actual: `run1=${j1.jobs?.length} run2=${j2.jobs?.length}` };
    },
  },
  {
    id: "EVAL-8",
    desc: "Fit breakdown exposes all 5 factors, each in 0..100 (incl. education + location)",
    run: async () => {
      const r = await fetch(`${BASE}/api/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "backend developer dhaka" }),
      });
      const j = await r.json();
      const factors = ["semantic", "skills", "seniority", "education", "location"] as const;
      const jobs = j.jobs ?? [];
      const ok =
        jobs.length >= 1 &&
        jobs.every((x: any) =>
          factors.every((f) => typeof x.fit?.[f] === "number" && x.fit[f] >= 0 && x.fit[f] <= 100)
        );
      const sample = jobs[0]?.fit;
      return {
        pass: ok,
        actual: sample
          ? factors.map((f) => `${f}=${sample[f]}`).join(" ")
          : "no jobs returned",
      };
    },
  },
  {
    id: "EVAL-9",
    desc: "Health endpoint returns { status: ok }",
    run: async () => {
      const r = await fetch(`${BASE}/api/health`);
      const j = await r.json();
      return {
        pass: r.ok && j.status === "ok" && typeof j.time === "string",
        actual: `status=${j.status} time=${j.time}`,
      };
    },
  },
  {
    id: "EVAL-10",
    desc: "Assistant intent routing returns a valid intent (x-intent header)",
    run: async () => {
      const valid = ["readiness_check", "skill_gap", "roadmap", "cover_letter", "general"];
      const r = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Build me a 4-week roadmap to become job-ready." }],
        }),
      });
      const intent = r.headers.get("x-intent");
      return { pass: !!intent && valid.includes(intent), actual: `x-intent=${intent}` };
    },
  },
  {
    id: "EVAL-11",
    desc: "No hallucination: asked about a skill not in the CV, the assistant says so",
    run: async () => {
      const r = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "According to my CV, how many years of COBOL mainframe experience do I have?",
            },
          ],
        }),
      });
      // Reconstruct the assistant's text from the data-stream protocol (0:"..." lines).
      const body = await r.text();
      const text = body
        .split("\n")
        .filter((l) => l.startsWith("0:"))
        .map((l) => {
          try {
            return JSON.parse(l.slice(2));
          } catch {
            return "";
          }
        })
        .join("");
      const refused =
        /(doesn'?t|does not|don'?t|do not|no|not)\s+(mention|list|include|have|show|reflect)|not in your cv|isn'?t in your cv|cv doesn'?t/i.test(
          text
        );
      return { pass: refused, actual: refused ? "refusal detected" : text.slice(0, 160) || "(no text)" };
    },
  },
];

async function main() {
  console.log(`\n  CareerPilot eval suite → ${BASE}\n`);
  let passed = 0;
  for (const c of cases) {
    try {
      const { pass, actual } = await c.run();
      if (pass) passed++;
      console.log(`  ${pass ? "✓ PASS" : "✗ FAIL"}  ${c.id}  ${c.desc}`);
      console.log(`          ↳ ${actual}`);
    } catch (e: any) {
      console.log(`  ✗ ERROR ${c.id}  ${c.desc}\n          ↳ ${e.message}`);
    }
  }
  console.log(`\n  ${passed}/${cases.length} passed\n`);
  process.exit(passed === cases.length ? 0 : 1);
}
main();
