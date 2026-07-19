import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// `next` must be an in-app relative path, never a full URL — new URL(next, origin) ignores the
// origin entirely when next is itself absolute, which would let ?next= redirect anywhere
// (open redirect / phishing vector) right after a real login.
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=We could not complete sign-in.", url.origin)
  );
}
