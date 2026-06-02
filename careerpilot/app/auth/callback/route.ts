import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const safePaths = ["/dashboard", "/profile", "/settings", "/tracker", "/hunter", "/"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = safePaths.includes(nextRaw) ? nextRaw : "/dashboard";

  if (code) {
    let supabaseResponse = NextResponse.redirect(`${origin}${next}`);

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
            supabaseResponse = NextResponse.redirect(`${origin}${next}`);
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
    return supabaseResponse;
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
