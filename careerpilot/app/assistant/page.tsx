"use client";
import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const QUICK = [
  "Am I ready for a Software Engineer role at Google?",
  "What skills am I missing for a Google internship?",
  "Build me a 3-month roadmap to become job-ready.",
  "Draft a cover letter for a React frontend internship.",
];

const INTENT_LABELS: Record<string, string> = {
  readiness_check: "readiness check",
  skill_gap: "skill gap",
  roadmap: "roadmap",
  cover_letter: "cover letter",
  general: "general",
};

export default function AssistantPage() {
  const sessionId = useRef(`sess-${Date.now()}`);
  const [intent, setIntent] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: "/api/chat",
    body: { sessionId: sessionId.current },
    onResponse: (res) => {
      const i = res.headers.get("x-intent");
      if (i) setIntent(i);
    },
  });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col py-4">
      <div className="mb-4">
        <p className="label mb-2">Pillar 3 · Personal AI Assistant</p>
        <h1 className="font-display text-3xl font-bold">It already knows your CV.</h1>
        {intent && (
          <p className="mt-2 flex items-center gap-2 text-sm text-chalk-dim">
            <span className="label">detected intent</span>
            <span className="chip bg-sky/10 text-sky">{INTENT_LABELS[intent] ?? intent}</span>
            {intent === "roadmap" && (
              <Link href="/roadmap" className="text-signal underline-offset-4 hover:underline">
                open structured roadmap →
              </Link>
            )}
          </p>
        )}
      </div>

      <div className="panel flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => append({ role: "user", content: q })}
                  className="panel p-3 text-left text-sm text-chalk-dim transition-colors hover:border-signal/50 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] animate-fade-up whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-signal text-ink-900"
                    : "border border-ink-600 bg-ink-900/60 text-chalk"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && <p className="text-sm text-amber animate-pulse-glow">Retrieving CV context…</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-600 p-3">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything about your career…"
            className="flex-1 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 text-chalk outline-none placeholder:text-chalk-faint focus:border-signal/60"
          />
          <button type="submit" disabled={isLoading} className="btn-signal disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
