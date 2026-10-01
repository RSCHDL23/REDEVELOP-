import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isDemoMode) (await cookies()).delete("re_demo");
  else await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
