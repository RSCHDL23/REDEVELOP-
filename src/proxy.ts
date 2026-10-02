import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Runs before each page. Keeps the sign-in session fresh and sends signed-out
 * visitors to the sign-in page. Real permission checks happen in the database.
 */
export async function proxy(request: NextRequest) {
  // Sign-in pages, professionals' public profile links (/p/...) and review links (/r/...) need no account.
  const isPublic = ["/login", "/auth", "/p/", "/r/"].some((p) => request.nextUrl.pathname.startsWith(p));

  if (isDemoMode) {
    if (!isPublic && !request.cookies.get("re_demo")) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-touch-icon|wordmark|manifest.webmanifest|demo/|.*\\.(?:png|svg|jpg|jpeg|webp)$).*)"],
};
