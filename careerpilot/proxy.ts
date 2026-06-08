import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets nonce-trusted scripts load further scripts (webpack chunks etc.)
    // 'unsafe-inline' is ignored by browsers that honour nonces, kept for legacy fallback only
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    // Inline styles are needed by styled-jsx, next-themes, and Tailwind generated blocks
    "style-src 'self' 'unsafe-inline'",
    // next/image proxies external images through /_next/image so 'self' covers most cases;
    // blob: is needed for canvas/object-URL previews, data: for Base64 avatars
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    // Supabase realtime/storage, Gemini, Groq, JSearch
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://generativelanguage.googleapis.com",
      "https://api.groq.com",
      "https://jsearch.p.rapidapi.com",
    ].join(" "),
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default async function proxy(request: NextRequest) {
  // Per-request nonce — threaded to the layout so next-themes & Next.js inline
  // scripts get the nonce attribute and aren't blocked by the strict CSP.
  const nonce = crypto.randomUUID();

  // Build modified request headers that forward the nonce to the RSC layout.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the original request object first
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Re-sync the Cookie header inside requestHeaders so x-nonce survives the
          // NextResponse.next() re-creation that Supabase performs on session refresh
          requestHeaders.set(
            "cookie",
            request.cookies.getAll().map((c) => `${c.name}=${c.value}`).join("; ")
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Read session from cookie (no network round-trip). API routes call requireUser()
  // → getUser() for real JWT verification; here we only need redirect logic.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/hunter") ||
    pathname.startsWith("/assistant") ||
    pathname.startsWith("/tracker") ||
    pathname.startsWith("/roadmap") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/fit") ||
    pathname.startsWith("/skill-gap") ||
    pathname.startsWith("/interview");

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  const csp = buildCsp(nonce);

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  if (user && (isAuthRoute || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // Security headers on every non-redirect response
  supabaseResponse.headers.set("Content-Security-Policy", csp);
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return supabaseResponse;
}

export const config = {
  // Skip /api/* entirely — every API handler already enforces auth via
  // requireUser(), so running middleware.getUser() on top is a wasted
  // round-trip to Supabase per request.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
