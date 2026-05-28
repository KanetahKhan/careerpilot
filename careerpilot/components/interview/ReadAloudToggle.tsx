"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Optional TTS toggle: reads the interviewer's latest question aloud via the
 * browser-native SpeechSynthesis API. Frontend only, no dependency.
 *
 * - Hidden when SpeechSynthesis is unavailable.
 * - While enabled, each new (non-empty, changed) `text` is spoken once.
 * - Toggling off (or unmounting) cancels any in-flight speech.
 */
export function ReadAloudToggle({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const lastSpokenRef = useRef<string>("");

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    if (!enabled) {
      synth.cancel();
      return;
    }

    const value = text.trim();
    if (!value || value === lastSpokenRef.current) return;

    lastSpokenRef.current = value;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = "en-US";
    utterance.rate = 1;
    synth.speak(utterance);
  }, [text, enabled, supported]);

  // Stop speaking if the control leaves the screen (e.g. on reset/feedback).
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      // Re-speak the current question when turning the toggle back on.
      if (next) lastSpokenRef.current = "";
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Stop reading questions aloud" : "Read questions aloud"}
      className={`chip border transition-colors ${
        enabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {enabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
      {enabled ? "Reading aloud" : "Read aloud"}
    </button>
  );
}
