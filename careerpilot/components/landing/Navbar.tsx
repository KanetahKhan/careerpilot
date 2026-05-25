"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemePreset } from "@/components/ThemePresetProvider";
import { useAuth } from "@/components/AuthProvider";

export function Navbar() {
  const { user, loading } = useAuth();
  const { preset, setPreset, presets } = useThemePreset();
  const [showPalette, setShowPalette] = useState(false);
  const palRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (palRef.current && !palRef.current.contains(e.target as Node))
        setShowPalette(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="landing-nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <Sparkles size={20} />
          <span>CareerPilot</span>
        </Link>

        <div className="nav-right">
          {loading ? (
            <div className="nav-skeleton" />
          ) : user ? (
            <Link href="/hunter" className="nav-dashboard-btn">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="nav-signin">
                Sign In
              </Link>
              <Link href="/auth?mode=signup" className="nav-signup-btn">
                Get Started Free
              </Link>
            </>
          )}

          <div className="nav-preset-picker" ref={palRef}>
            <button
              className="preset-dot-btn"
              onClick={() => setShowPalette(!showPalette)}
              aria-label="Change color theme"
              title="Color theme"
            >
              <Palette size={14} />
            </button>

            {showPalette && (
              <div className="preset-dropdown">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    className={`preset-option ${preset.name === p.name ? "active" : ""}`}
                    onClick={() => { setPreset(p.name); setShowPalette(false); }}
                  >
                    <span
                      className="preset-swatch"
                      style={{ backgroundColor: `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)` }}
                    />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ThemeToggle />
        </div>
      </div>

      <style jsx>{`
        .nav-preset-picker {
          position: relative;
          display: flex;
          align-items: center;
        }
        .preset-dot-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all 0.2s;
        }
        .preset-dot-btn:hover {
          background: hsl(var(--secondary));
          color: hsl(var(--foreground));
        }
        .preset-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          padding: 6px;
          box-shadow: 0 8px 32px hsl(var(--foreground) / 0.15);
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 130px;
        }
        .preset-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: hsl(var(--foreground));
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .preset-option:hover {
          background: hsl(var(--secondary));
        }
        .preset-option.active {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          font-weight: 600;
        }
        .preset-swatch {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 1px solid hsl(var(--border));
        }
      `}</style>
    </nav>
  );
}
