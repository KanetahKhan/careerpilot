"use client";

import { useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCharacter } from "@/components/auth/AuthCharacter";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import "./auth.css";

function AuthPageInner() {
  const searchParams = useSearchParams();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [charState, setCharState] = useState<"idle" | "error">("idle");
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleError = useCallback(() => {
    setCharState("error");
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setCharState("idle"), 2000);
  }, []);

  const toggleMode = () => {
    setIsSignup((prev) => !prev);
    setCharState("idle");
    clearTimeout(errorTimer.current);
  };

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignup ? "signup-mode" : ""}`}>

        <div className="sliding-panel">
          <div className="panel-content">
            <div className="panel-inner">
              <AuthCharacter
                mode={isSignup ? "signup" : "login"}
                state={charState}
              />
              <div className="panel-text">
                <h2>{isSignup ? "Hello, Friend!" : "Welcome Back!"}</h2>
                <p>
                  {isSignup
                    ? "Enter your personal details and start your journey with us"
                    : "To keep connected with us please login with your personal info"}
                </p>
                <button className="panel-btn" onClick={toggleMode}>
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-side right">
          <LoginForm
            onSwitch={() => setIsSignup(true)}
            onError={handleError}
          />
        </div>

        <div className="form-side left">
          <SignupForm
            onSwitch={() => setIsSignup(false)}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
