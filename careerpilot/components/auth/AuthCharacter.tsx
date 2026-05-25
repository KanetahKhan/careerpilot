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
    <div className="felix-box">
      <div className={`felix-bubble ${state === "error" ? "bubble-shake" : ""}`}>
        {bubbleText()}
      </div>

      <div className={`felix-wrap ${playing ? "" : "gentle-breathe"}`}>
        {playing ? (
          <Image
            key={currentFrame}
            src={SAD_FRAMES[currentFrame]}
            alt="Felix is sad"
            width={160}
            height={160}
            priority
            className="felix-img"
          />
        ) : (
          <Image
            src="/characters/idle.png"
            alt="Felix"
            width={160}
            height={160}
            priority
            className="felix-img"
          />
        )}
      </div>

      <style jsx>{`
        .felix-box {
          position: relative;
          width: 220px;
          height: 260px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .felix-bubble {
          position: absolute;
          top: 0;
          right: -10px;
          background: hsl(var(--card));
          padding: 8px 14px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--foreground));
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          white-space: nowrap;
          z-index: 20;
          transition: all 0.2s ease;
          border: 1px solid hsl(var(--border));
        }
        .felix-bubble::after {
          content: "";
          position: absolute;
          bottom: -5px;
          left: 14px;
          width: 10px;
          height: 10px;
          background: hsl(var(--card));
          border-right: 1px solid hsl(var(--border));
          border-bottom: 1px solid hsl(var(--border));
          transform: rotate(45deg);
        }
        .bubble-shake {
          animation: bubble-shake 0.5s ease-in-out;
          color: hsl(var(--destructive));
        }
        @keyframes bubble-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        .felix-wrap {
          position: relative;
          z-index: 5;
          width: 160px;
          height: 160px;
        }

        .gentle-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .felix-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 8px 20px rgba(0,0,0,0.12));
        }
      `}</style>
    </div>
  );
}
