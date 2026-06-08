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

export function AuthCharacter({ state = "idle" }: AuthCharacterProps) {
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

  return (
    <div className="relative flex h-[260px] w-[220px] items-end justify-center">
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
        @keyframes breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
