"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { cn } from "@/lib/utils";
import type { RetrievedChunk } from "@/types/chat";

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
  const [citationsMap, setCitationsMap] = useState<Record<string, RetrievedChunk[]>>({});
  const pendingCitations = useRef<RetrievedChunk[] | null>(null);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: "/api/chat",
    body: { sessionId: sessionId.current },
    fetch: async (url, options) => {
      const response = await fetch(url, options);
      const retrievedHeader = response.headers.get("x-retrieved");
      if (retrievedHeader) {
        try {
          const decoded = atob(retrievedHeader);
          const chunks: RetrievedChunk[] = JSON.parse(decoded);
          pendingCitations.current = chunks;
        } catch {
          pendingCitations.current = null;
        }
      }
      const intentHeader = response.headers.get("x-intent");
      if (intentHeader) setIntent(intentHeader);
      return response;
    },
    onFinish: (message) => {
      if (pendingCitations.current && message.role === "assistant") {
        setCitationsMap((prev) => ({
          ...prev,
          [message.id]: pendingCitations.current!,
        }));
        pendingCitations.current = null;
      }
    },
  });

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  return (
    <FadeIn>
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4 shrink-0">
        <p className="label mb-2">Pillar 3 · Personal AI Assistant</p>
        <h1 className="font-display text-3xl font-bold">It already knows your CV.</h1>
        {intent && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="label">detected intent</span>
            <span className="chip bg-sky-400/10 text-sky-400">{INTENT_LABELS[intent] ?? intent}</span>
            {intent === "roadmap" && (
              <Link href="/roadmap" className="text-primary underline-offset-4 hover:underline">
                open structured roadmap →
              </Link>
            )}
          </p>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 border border-border rounded-lg bg-card p-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => append({ role: "user", content: q })}
                className="p-3 text-left text-sm text-muted-foreground rounded-lg border border-border hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col max-w-[85%] rounded-lg p-4",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-card border border-border text-foreground"
            )}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>

            {/* CITATION CHIPS — only for assistant messages */}
            {message.role === "assistant" && citationsMap[message.id]?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Based on your CV:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {citationsMap[message.id].map((chunk, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary border border-primary/20"
                    >
                      <span className="font-medium">{chunk.section}</span>
                      <span className="text-primary/60">
                        {(chunk.similarity * 100).toFixed(0)}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto bg-card border border-border rounded-lg p-4 max-w-[85%]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Retrieving CV context…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4 bg-background rounded-b-lg">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything about your career…"
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
    </FadeIn>
  );
}
