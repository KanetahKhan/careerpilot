"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Route, Mic, FileText, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { PageHeader } from "@/components/PageHeader";
import { StaggerContainer, StaggerItem } from "@/components/StaggerContainer";
import { VoiceInputButton } from "@/components/interview/VoiceInputButton";
import { ReadAloudToggle } from "@/components/interview/ReadAloudToggle";

type Question = {
  question: string;
  type: "behavioral" | "role-specific" | "gap-probing";
  rationale: string;
};

type Competency = {
  competency: string;
  score: number;
  strengths: string[];
  gaps: string[];
  suggestion: string;
};

type FeedbackData = {
  overallAssessment: string;
  competencies: Competency[];
  strongRecommend: boolean;
};

type Step = "setup" | "interview" | "feedback";

export default function InterviewPage() {
  const [step, setStep] = useState<Step>("setup");
  const [jd, setJd] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const startInterview = async () => {
    const jdTrimmed = jd.trim();
    if (jdTrimmed.length < 10) {
      setError("Paste a job description (at least 10 characters).");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jdTrimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start interview");
      setSessionId(json.sessionId);
      setRole(json.role);
      setQuestions(json.questions);
      setTranscript([]);
      setCurrentIdx(0);
      setStep("interview");
      await streamTurn(json.sessionId, json.questions, [], jdTrimmed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const streamTurn = useCallback(
    async (
      sid: string,
      qs: Question[],
      currentTranscript: { role: string; content: string }[],
      jdStr: string,
    ) => {
      setStreaming(true);
      setStreamText("");
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/interview/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            jd: jdStr,
            questions: qs,
            messages: currentTranscript,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Turn failed" }));
          throw new Error(err.error ?? "Turn failed");
        }
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const delta = JSON.parse(line.slice(2));
                if (typeof delta === "string") {
                  fullText += delta;
                  setStreamText(fullText);
                }
              } catch {
                // skip unparseable lines
              }
            }
          }
        }
        setTranscript((prev) => [...prev, { role: "assistant", content: fullText }]);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const sendAnswer = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg = { role: "user" as const, content: text };
    const updated = [...transcript, userMsg];
    setTranscript(updated);
    setInput("");
    setCurrentIdx((prev) => prev + 1);
    await streamTurn(sessionId, questions, updated, jd);
  };

  const getFeedback = async () => {
    setFeedbackLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jd, questions, transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feedback failed");
      setFeedback(json.feedback);
      setStep("feedback");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const reset = () => {
    setStep("setup");
    setJd("");
    setSessionId("");
    setRole("");
    setQuestions([]);
    setTranscript([]);
    setCurrentIdx(0);
    setInput("");
    setStreamText("");
    setError(null);
    setFeedback(null);
    setFeedbackLoading(false);
  };

  const showAllQuestionsAnswered = !streaming && questions.length > 0 && currentIdx >= questions.length;
  const lastInterviewerMessage =
    [...transcript].reverse().find((m) => m.role === "assistant")?.content ?? "";

  return (
    <FadeIn>
      <div className="space-y-6 py-4">
        {step === "setup" ? (
          <header>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Pillar 3 · Mock Interview Agent
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
              Practice with an AI interviewer.
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Paste a real job description and get 5 tailored questions. Answer one at a time,
              then receive structured per-competency feedback.
            </p>
          </header>
        ) : (
          <PageHeader
            eyebrow="Pillar 3 · Mock Interview Agent"
            title={step === "interview" ? `Interviewing for ${role}` : "Your interview feedback"}
            icon={Mic}
          />
        )}

        {error && (
          <p className="text-sm text-primary">⚠ {error}</p>
        )}

        {step === "setup" && (
          <div className="max-w-3xl">
            <div className="panel p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2 font-display font-bold text-primary">
                <FileText size={18} /> Job Description
              </div>
              <label htmlFor="interview-jd" className="sr-only">Job Description</label>
              <textarea
                id="interview-jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here… (e.g. Senior Frontend Engineer at CloudTech)"
                rows={10}
                className="w-full resize-none rounded-2xl border border-border bg-background/50 p-5 text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
              />
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Tip: Include requirements and responsibilities
                </p>
                <button
                  onClick={startInterview}
                  disabled={starting || jd.trim().length < 10}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {starting ? "Generating questions…" : "Start interview"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "interview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="label">
                Question {Math.min(currentIdx + 1, questions.length)}/{questions.length}
              </span>
              {currentIdx < questions.length && (
                <span className="chip bg-primary/10 text-primary">
                  {questions[currentIdx]?.type ?? ""}
                </span>
              )}
              <div className="ml-auto">
                <ReadAloudToggle text={lastInterviewerMessage} />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3 border border-border rounded-lg bg-card p-4">
              {transcript.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col max-w-[85%] rounded-lg p-4 ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-card border border-border text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                </div>
              ))}
              {streaming && (
                <div className="mr-auto bg-card border border-border rounded-lg p-4 max-w-[85%]">
                  {streamText ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{streamText}</div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Interviewer is typing…
                    </div>
                  )}
                </div>
              )}
            </div>

            {!streaming && !showAllQuestionsAnswered && (
              <div className="flex gap-2">
                <input
                  id="interview-answer"
                  aria-label="Your answer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAnswer()}
                  placeholder="Type or speak your answer…"
                  className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
                />
                <VoiceInputButton value={input} onChange={setInput} />
                <button
                  onClick={sendAnswer}
                  disabled={!input.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  Send answer
                </button>
              </div>
            )}

            {showAllQuestionsAnswered && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  All questions answered! Ready for structured feedback?
                </p>
                <button
                  onClick={getFeedback}
                  disabled={feedbackLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {feedbackLoading ? "Analyzing…" : "Get feedback →"}
                </button>
              </div>
            )}
          </div>
        )}

        {step === "feedback" && feedback && (
          <div className="space-y-5">
            <div className="panel animate-fade-up p-5">
              <p className="label mb-2">Overall assessment</p>
              <p className="text-sm leading-relaxed text-foreground">
                {feedback.overallAssessment}
              </p>
              {feedback.strongRecommend ? (
                <p className="mt-3 text-sm text-primary font-medium">
                  Strong recommend ✓
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground font-medium">
                  Not a strong recommend
                </p>
              )}
            </div>

            <StaggerContainer className="grid gap-4 md:grid-cols-2">
              {feedback.competencies.map((c) => (
                <StaggerItem key={c.competency}>
                  <div className="panel animate-fade-up p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-lg font-bold">{c.competency}</p>
                      <span className="chip bg-primary/10 text-primary">{c.score}/5</span>
                    </div>
                    {c.strengths.length > 0 && (
                      <div className="mt-3">
                        <p className="label mb-1 text-primary">Strengths</p>
                        <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                          {c.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {c.gaps.length > 0 && (
                      <div className="mt-3">
                        <p className="label mb-1 text-destructive">Gaps</p>
                        <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                          {c.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground italic">{c.suggestion}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {feedback.competencies.some((c) => c.gaps.length > 0) && (
              <div className="panel animate-fade-up p-5">
                <p className="label mb-2">Close your gaps</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Build a structured roadmap to address the gaps identified above.
                </p>
                <a
                  href={`/roadmap?goal=${encodeURIComponent(
                    `Prepare for a ${role} role — gaps: ${feedback.competencies
                      .filter((c) => c.gaps.length > 0)
                      .map((c) => c.competency)
                      .join(", ")}`,
                  )}`}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Route size={14} />
                  Build roadmap →
                </a>
              </div>
            )}

            <button onClick={reset} className="btn-ghost text-sm">
              ← Start a new interview
            </button>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
