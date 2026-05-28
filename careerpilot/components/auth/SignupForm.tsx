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
      <div className="auth-form">
        <style jsx>{`
          .auth-form { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; padding-top: 40px; text-align: center; }
          .title { font-size: 24px; font-weight: 700; color: hsl(var(--foreground)); margin: 0; }
          .subtitle { font-size: 14px; color: hsl(var(--muted-foreground)); line-height: 1.5; }
          .btn { padding: 14px 24px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
          .btn:hover { opacity: 0.9; }
        `}</style>
        <h1 className="title">Check your inbox</h1>
        <p className="subtitle">We sent a confirmation email to <strong style={{ color: "hsl(var(--foreground))" }}>{email}</strong>. Click the link in the email to activate your account, then sign in.</p>
        <button onClick={onSwitch} className="btn">Go to sign in</button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <style jsx>{`
        .auth-form { width: 100%; display: flex; flex-direction: column; gap: 14px; }
        .form-header { display: flex; align-items: flex-start; gap: 12px; }
        .form-header-text { flex: 1; }
        .form-title { font-size: 22px; font-weight: 700; color: hsl(var(--foreground)); margin: 0; }
        .form-subtitle { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 2px; }

        .theme-btn {
          padding: 8px; border-radius: 50%; border: 1px solid hsl(var(--border));
          background: hsl(var(--background)); cursor: pointer; color: hsl(var(--muted-foreground));
          display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
        }
        .theme-btn:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }

        .social-btn {
          width: 100%; padding: 10px; border: 1px solid hsl(var(--border)); border-radius: 10px;
          background: hsl(var(--background)); display: flex; align-items: center; justify-content: center;
          gap: 8px; font-size: 13px; font-weight: 500; color: hsl(var(--foreground)); cursor: pointer;
          transition: all 0.2s;
        }
        .social-btn:hover { background: hsl(var(--secondary)); }

        .divider {
          display: flex; align-items: center; gap: 12px;
          color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: hsl(var(--border)); }

        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 12px; font-weight: 500; color: hsl(var(--foreground)); }
        .field input {
          width: 100%; padding: 10px 12px; border: 1px solid hsl(var(--input)); border-radius: 10px;
          background: hsl(var(--background)); font-size: 13px; color: hsl(var(--foreground));
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .field input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15); }
        .field input::placeholder { color: hsl(var(--muted-foreground)); }

        .password-wrap { position: relative; }
        .password-wrap input { padding-right: 38px; }
        .eye-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: hsl(var(--muted-foreground)); padding: 4px;
          display: flex;
        }
        .eye-btn:hover { color: hsl(var(--foreground)); }

        .field-error {
          font-size: 12px; color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.1);
          padding: 8px 12px; border-radius: 8px; margin: 0;
        }

        .submit-btn {
          width: 100%; padding: 12px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none;
          border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      <div className="form-header">
        <div className="form-header-text">
          <h1 className="form-title">Create account</h1>
          <p className="form-subtitle">Get started with your career journey</p>
        </div>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="theme-btn" aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <button className="social-btn" type="button" onClick={handleGoogle} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {isLoading ? <Loader2 size={16} className="spinner" /> : "Sign up with Google"}
      </button>

      <div className="divider"><span>or sign up with email</span></div>

      <form className="form-fields" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <label>Full Name</label>
          <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <div className="password-wrap">
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Confirm Password</label>
          <div className="password-wrap">
            <input type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? <><Loader2 size={16} className="spinner" /> Creating account...</> : "Create account"}
          {!isLoading && <ArrowRight size={18} />}
        </button>
      </form>

    </div>
  );
}
