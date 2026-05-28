import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — this also sets the refreshed cookies on the response
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes: everything under /(app) except the landing page
  const isAppRoute =
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
    pathname === "/auth";

  const isHome = pathname === "/";

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/hunter";
    return NextResponse.redirect(url);
  }

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
