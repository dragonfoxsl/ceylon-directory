import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Password reset links carry type=recovery — land on the update-password form.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/update-password`);
  }

  // Email confirmation after signup — onboarding landing page.
  if (type === "signup") {
    return NextResponse.redirect(`${origin}/auth/confirmed`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
