"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const SAD_FRAMES = [
  "/characters/sad_frame_00.png",
  "/characters/sad_frame_01.png",
  "/characters/sad_frame_02.png",
  "/characters/sad_frame_03.png",
  "/characters/sad_frame_04.png",
];

interface AuthCharacterProps {
  mode: "login" | "signup";
  state?: "idle" | "error";
}

export function AuthCharacter({ mode, state = "idle" }: AuthCharacterProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (state === "error") {
      setCurrentFrame(0);
      setPlaying(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i >= SAD_FRAMES.length) {
          clearInterval(interval);
          setPlaying(false);
          return;
        }
        setCurrentFrame(i);
      }, 400);
      return () => {
        clearInterval(interval);
        setPlaying(false);
      };
    }
    setPlaying(false);
    setCurrentFrame(0);
  }, [state]);

  const bubbleText = () => {
    if (state === "error") return "Oops, that's not right!";
    return mode === "signup" ? "Let's get started!" : "Welcome back!";
  };

  return (
    <div className="relative flex h-[260px] w-[220px] items-end justify-center">
      <div
        className={`absolute right-[-10px] top-0 z-20 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-semibold text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-200 after:absolute after:bottom-[-5px] after:left-[14px] after:h-[10px] after:w-[10px] after:rotate-45 after:border-b after:border-r after:border-border after:bg-card after:content-[''] ${
          state === "error" ? "text-destructive animate-[bubbleShake_0.5s_ease-in-out]" : ""
        }`}
      >
        {bubbleText()}
      </div>

      <div
        className={`relative z-[5] h-[160px] w-[160px] ${
          playing ? "" : "animate-[breathe_4s_ease-in-out_infinite]"
        }`}
      >
        {playing ? (
          <Image
            key={currentFrame}
            src={SAD_FRAMES[currentFrame]}
            alt="Felix is sad"
            width={160}
            height={160}
            priority
            className="h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
          />
        ) : (
          <Image
            src="/characters/idle.png"
            alt="Felix"
            width={160}
            height={160}
            priority
            className="h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
          />
        )}
      </div>

      <style jsx>{`
        @keyframes bubbleShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
