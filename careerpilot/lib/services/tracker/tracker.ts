import { createAdminClient } from "@/lib/supabase";

export type ApplicationStatus = "applied" | "interviewing" | "offer" | "rejected";

export type NewApplication = {
  role: string;
  company: string;
  location?: string | null;
  fit_score?: number | null;
  link?: string | null;
  status?: ApplicationStatus | string;
};

export async function listApplications(userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function createApplication(userId: string, input: NewApplication) {
  const supabase = createAdminClient();
  return supabase
    .from("applications")
    .insert({
      user_id: userId,
      role: input.role,
      company: input.company,
      location: input.location ?? null,
      fit_score: input.fit_score ?? null,
      link: input.link ?? null,
      status: input.status ?? "applied",
    })
    .select("*")
    .single();
}

export async function updateApplicationStatus(id: string, userId: string, status: string) {
  const supabase = createAdminClient();
  return supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
}

export async function listGoals(userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
}

export async function createGoal(userId: string, title: string, dueDate?: string | null) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .insert({ user_id: userId, title, due_date: dueDate ?? null })
    .select("*")
    .single();
}

export async function setGoalDone(id: string, userId: string, done: boolean) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .update({ done })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
}
