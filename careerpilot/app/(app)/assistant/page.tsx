"use client";

import { useChat, type Message } from "ai/react";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Download, FileText, Printer, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import type { RetrievedChunk } from "@/types/chat";
import {
  downloadCoverLetterDocx,
  printCoverLetter,
  looksLikeCoverLetter,
} from "@/lib/export/client";

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

const SESSION_STORAGE_KEY = "cp_chat_session";

function newSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const fresh = newSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
  return fresh;
}

type Ready = {
  sessionId: string;
  initial: Message[];
};

export default function AssistantPage() {
  const [ready, setReady] = useState<Ready | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}&limit=50`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load history");
      const initial: Message[] = (json.messages as { role: string; content: string }[]).map(
        (m, i) => ({
          id: `hist-${sessionId}-${i}`,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })
      );
      setReady({ sessionId, initial });
    } catch (e: any) {
      setLoadError(e.message);
      setReady({ sessionId, initial: [] });
    }
  }, []);

  useEffect(() => {
    const id = readOrCreateSessionId();
    if (!id) return;
    loadSession(id);
  }, [loadSession]);

  function startNewChat() {
    const fresh = newSessionId();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    }
    setLoadError(null);
    setReady({ sessionId: fresh, initial: [] });
  }

  if (!ready) {
    return (
      <FadeIn>
        <div className="flex flex-col h-[calc(100vh-7rem)]">
          <div className="mb-4 shrink-0">
            <PageHeader
              eyebrow="Pillar 3 · Personal AI Assistant"
              title="It already knows your CV."
              icon={Sparkles}
              gradient="from-primary via-primary/70 to-primary"
            />
          </div>
          <div className="flex-1 grid place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Restoring your conversation…
            </div>
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <Chat
      key={ready.sessionId}
      sessionId={ready.sessionId}
      initialMessages={ready.initial}
      onNewChat={startNewChat}
      loadError={loadError}
    />
  );
}

function Chat({
  sessionId,
  initialMessages,
  onNewChat,
  loadError,
}: {
  sessionId: string;
  initialMessages: Message[];
  onNewChat: () => void;
  loadError: string | null;
}) {
  const [intent, setIntent] = useState<string | null>(null);
  const [citationsMap, setCitationsMap] = useState<Record<string, RetrievedChunk[]>>({});
  const [intentsMap, setIntentsMap] = useState<Record<string, string>>({});
  const pendingCitations = useRef<RetrievedChunk[] | null>(null);
  const pendingIntent = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRef = useCallback(async (input: URL | RequestInfo, init?: RequestInit) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const response = await fetch(input, { ...init, signal: controller.signal });
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
    if (intentHeader) {
      setIntent(intentHeader);
      pendingIntent.current = intentHeader;
    }
    return response;
  }, []);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { sessionId },
    fetch: fetchRef,
    onFinish: (message) => {
      if (message.role === "assistant") {
        if (pendingCitations.current) {
          setCitationsMap((prev) => ({
            ...prev,
            [message.id]: pendingCitations.current!,
          }));
          pendingCitations.current = null;
        }
        if (pendingIntent.current) {
          setIntentsMap((prev) => ({
            ...prev,
            [message.id]: pendingIntent.current!,
          }));
          pendingIntent.current = null;
        }
      }
    },
  });

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  return (
    <FadeIn>
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4 shrink-0">
        <PageHeader
          eyebrow="Pillar 3 · Personal AI Assistant"
          title="It already knows your CV."
          icon={Sparkles}
          gradient="from-primary via-primary/70 to-primary"
        >
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-background/60 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            title="Start a fresh conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </PageHeader>
        {intent && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="label">detected intent</span>
            <span className="chip bg-primary/10 text-primary">{INTENT_LABELS[intent] ?? intent}</span>
            {intent === "roadmap" && (
              <Link href="/roadmap" className="text-primary underline-offset-4 hover:underline">
                open structured roadmap →
              </Link>
            )}
          </p>
        )}
      </div>

      {loadError && (
        <p className="mb-2 text-xs text-destructive">
          Couldn’t restore previous messages: {loadError}
        </p>
      )}

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
        {messages.map((message) => {
          const isCoverLetter =
            message.role === "assistant" &&
            (intentsMap[message.id] === "cover_letter" ||
              looksLikeCoverLetter(typeof message.content === "string" ? message.content : ""));
          return (
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

            {/* DOWNLOAD — only for assistant cover-letter messages */}
            {isCoverLetter && (
              <CoverLetterDownload text={typeof message.content === "string" ? message.content : ""} />
            )}

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
          );
        })}

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

function CoverLetterDownload({ text }: { text: string }) {
  const [busy, setBusy] = useState<"docx" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function todayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  async function onDocx() {
    setBusy("docx");
    setErr(null);
    try {
      await downloadCoverLetterDocx(text, {
        filename: `cover-letter-${todayStamp()}.docx`,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5">
        <Download className="h-3 w-3" />
        Download
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onDocx}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
        >
          <FileText className="h-3 w-3" />
          {busy === "docx" ? "Building…" : "Word (.docx)"}
        </button>
        <button
          type="button"
          onClick={() => printCoverLetter(text)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:border-primary/50 transition-colors"
        >
          <Printer className="h-3 w-3" />
          PDF
        </button>
      </div>
      {err && <p className="mt-1.5 text-xs text-destructive">{err}</p>}
    </div>
  );
}
