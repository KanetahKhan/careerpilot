"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type Props = {
  /** Current answer text — used as the base the transcript is appended to. */
  value: string;
  /** Push updated text (live interim + finalized speech) back to the field. */
  onChange: (value: string) => void;
  disabled?: boolean;
};

function join(base: string, addition: string): string {
  if (!addition) return base;
  if (!base) return addition;
  return `${base} ${addition}`;
}

/**
 * Mic button that fills the answer field via the browser-native Web Speech API
 * (window.SpeechRecognition / webkitSpeechRecognition). Frontend only.
 *
 * - Hidden entirely when the API is unavailable (e.g. Firefox) so the page
 *   silently falls back to typing.
 * - Interim results stream into the field live; finalized text is kept so the
 *   user can edit before sending through the normal /turn flow.
 * - Permission-denied (and other) errors surface as an inline hint, never throw.
 */
export function VoiceInputButton({ value, onChange, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseRef = useRef(""); // committed text: field value at start + finalized chunks
  const valueRef = useRef(value);

  // Keep the latest field value reachable without re-creating the start handler.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Support detection runs after mount to avoid SSR/hydration mismatch.
  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Abort any in-flight recognition if the control unmounts (e.g. on submit).
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setHint(null);

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    baseRef.current = valueRef.current.trim();

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += text;
        else interim += text;
      }
      if (finalChunk.trim()) {
        baseRef.current = join(baseRef.current, finalChunk.trim());
      }
      onChange(interim.trim() ? join(baseRef.current, interim.trim()) : baseRef.current);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setHint("Microphone blocked. Allow mic access in your browser to use voice input.");
      } else if (event.error === "no-speech") {
        setHint("Didn't catch that — tap the mic and try again.");
      } else if (event.error !== "aborted") {
        setHint("Voice input hit an error. You can keep typing.");
      }
    };

    recognition.onend = () => {
      setRecording(false);
      onChange(baseRef.current); // drop any lingering interim text
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecording(true);
    } catch {
      // start() throws if invoked while already running — safe to ignore.
    }
  }, [onChange]);

  if (!supported) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled}
        aria-pressed={recording}
        aria-label={recording ? "Stop voice input" : "Answer by voice"}
        title={recording ? "Stop recording" : "Answer by voice"}
        className={`relative flex h-full items-center justify-center rounded-xl border px-3.5 py-3 transition-colors disabled:opacity-50 ${
          recording
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
        }`}
      >
        {recording && (
          <span className="pointer-events-none absolute inset-0 rounded-xl bg-primary/30 motion-safe:animate-ping" />
        )}
        {recording ? <Square className="relative h-5 w-5 fill-current" /> : <Mic className="relative h-5 w-5" />}
      </button>

      {hint && (
        <p
          role="status"
          className="absolute bottom-full right-0 z-10 mb-2 w-56 rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground shadow-lg"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
