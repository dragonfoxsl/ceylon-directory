import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("id, full_name, role").eq("id", user.id).single();
  return profile ? { ...user, profile } : { ...user, profile: null };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.profile?.role !== "admin") redirect("/login");
  return user;
}
