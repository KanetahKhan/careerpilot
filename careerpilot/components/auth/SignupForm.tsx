"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Eye, EyeOff, ArrowRight, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface SignupFormProps {
  onSwitch: () => void;
  onError: () => void;
}

export function SignupForm({ onSwitch, onError }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { theme, setTheme } = useTheme();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  async function handleGoogle() {
    setIsLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); onError(); }
    setIsLoading(false);
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) { onError(); setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { onError(); setError("Passwords do not match"); return; }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: { full_name: name },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("exists")
        ? "This email is already registered — please log in instead."
        : error.message;
      setError(msg);
      onError();
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setSuccess(true);
  }, [name, email, password, confirmPassword, onError, supabase]);

  if (success) {
    return (
      <div className="flex w-full flex-col items-center gap-4 pt-10 text-center">
        <h1 className="m-0 text-[24px] font-bold text-foreground">Check your inbox</h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          We sent a confirmation email to <strong className="text-foreground">{email}</strong>. Click the link in the email to activate your account, then sign in.
        </p>
        <button onClick={onSwitch} className="cursor-pointer rounded-xl border-none bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground hover:opacity-90">
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="m-0 text-[22px] font-bold text-foreground">Create account</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Get started with your career journey</p>
        </div>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex shrink-0 items-center justify-center rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background p-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary" type="button" onClick={handleGoogle} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Sign up with Google"}
      </button>

      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-name" className="text-[12px] font-medium text-foreground">Full Name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-[10px_12px] text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15 box-border"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="text-[12px] font-medium text-foreground">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-background p-[10px_12px] text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15 box-border"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-password" className="text-[12px] font-medium text-foreground">Password</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-[10px_12px] pr-[38px] text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15 box-border"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[10px] top-1/2 flex -translate-y-1/2 cursor-pointer border-none bg-none p-1 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-confirm" className="text-[12px] font-medium text-foreground">Confirm Password</label>
          <div className="relative">
            <input
              id="signup-confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-[10px_12px] pr-[38px] text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15 box-border"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-[10px] top-1/2 flex -translate-y-1/2 cursor-pointer border-none bg-none p-1 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="m-0 rounded-lg bg-destructive/10 p-[8px_12px] text-[12px] text-destructive">{error}</p>}

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border-none bg-primary p-3 text-[14px] font-semibold text-primary-foreground transition-opacity hover:not(:disabled):opacity-90 disabled:cursor-not-allowed disabled:opacity-70" disabled={isLoading}>
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : "Create account"}
          {!isLoading && <ArrowRight size={18} />}
        </button>
      </form>

    </div>
  );
}
