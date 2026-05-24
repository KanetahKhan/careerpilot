import { supabaseAdmin, DEMO_USER_ID } from "@/lib/supabase";

export type ApplicationStatus = "applied" | "interviewing" | "offer" | "rejected";

export type NewApplication = {
  role: string;
  company: string;
  location?: string | null;
  fit_score?: number | null;
  link?: string | null;
  status?: ApplicationStatus | string;
};

/** List the demo user's applications, newest first. */
export async function listApplications() {
  const supabase = supabaseAdmin();
  return supabase
    .from("applications")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false });
}

/** Create an application (from a tracked job card). */
export async function createApplication(input: NewApplication) {
  const supabase = supabaseAdmin();
  return supabase
    .from("applications")
    .insert({
      user_id: DEMO_USER_ID,
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

/** Move an application along the Kanban pipeline. */
export async function updateApplicationStatus(id: string, status: string) {
  const supabase = supabaseAdmin();
  return supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)
    .select("*")
    .single();
}

/** List the demo user's goals, soonest due first. */
export async function listGoals() {
  const supabase = supabaseAdmin();
  return supabase
    .from("goals")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("due_date", { ascending: true });
}

/** Create a goal / to-do. */
export async function createGoal(title: string, dueDate?: string | null) {
  const supabase = supabaseAdmin();
  return supabase
    .from("goals")
    .insert({ user_id: DEMO_USER_ID, title, due_date: dueDate ?? null })
    .select("*")
    .single();
}

/** Toggle a goal's done state. */
export async function setGoalDone(id: string, done: boolean) {
  const supabase = supabaseAdmin();
  return supabase
    .from("goals")
    .update({ done })
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)
    .select("*")
    .single();
}
