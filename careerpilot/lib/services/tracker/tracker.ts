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

const APP_COLS = "id, role, company, location, fit_score, status, link, created_at";
const GOAL_COLS = "id, title, due_date, done";
const EVENT_COLS = "id, title, event_date, type";
const NOTIF_COLS = "id, message, type, read, created_at, action";

export async function listApplications(userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("applications")
    .select(APP_COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function createApplication(userId: string, input: NewApplication) {
  const supabase = createAdminClient();

  const role = input.role.trim();
  const company = input.company.trim();

  // Check for existing application via DB constraint — fast targeted query.
  const { data: existing } = await supabase
    .from("applications")
    .select("id, role, company, location, fit_score, link, status, created_at")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("company", company)
    .maybeSingle();
  if (existing) return { data: existing, error: null };

  return supabase
    .from("applications")
    .insert({
      user_id: userId,
      role,
      company,
      location: input.location ?? null,
      fit_score: input.fit_score ?? null,
      link: input.link ?? null,
      status: input.status ?? "applied",
    })
    .select("id, role, company, location, fit_score, link, status, created_at")
    .single();
}

export async function updateApplicationStatus(id: string, userId: string, status: string) {
  const supabase = createAdminClient();
  return supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select(APP_COLS)
    .single();
}

export async function listGoals(userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .select(GOAL_COLS)
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
}

export async function createGoal(userId: string, title: string, dueDate?: string | null) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .insert({ user_id: userId, title, due_date: dueDate ?? null })
    .select(GOAL_COLS)
    .single();
}

export async function setGoalDone(id: string, userId: string, done: boolean) {
  const supabase = createAdminClient();
  return supabase
    .from("goals")
    .update({ done })
    .eq("id", id)
    .eq("user_id", userId)
    .select(GOAL_COLS)
    .single();
}

// ── Calendar events ──────────────────────────────────────────────────────────
export type EventType = "deadline" | "reminder" | "custom";

export type NewEvent = {
  title: string;
  event_date: string; // YYYY-MM-DD
  type?: EventType | string;
  related_goal_id?: string | null;
  related_application_id?: string | null;
};

export async function listEvents(userId: string, startDate?: string, endDate?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("user_id", userId);
  if (startDate) query = query.gte("event_date", startDate);
  if (endDate) query = query.lte("event_date", endDate);
  return query.order("event_date", { ascending: true });
}

export async function createEvent(userId: string, input: NewEvent) {
  const supabase = createAdminClient();
  return supabase
    .from("events")
    .insert({
      user_id: userId,
      title: input.title,
      event_date: input.event_date,
      type: input.type ?? "custom",
      related_goal_id: input.related_goal_id ?? null,
      related_application_id: input.related_application_id ?? null,
    })
    .select(EVENT_COLS)
    .single();
}

export async function deleteEvent(id: string, userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select(EVENT_COLS)
    .single();
}

// ── Notifications / AI nudges ────────────────────────────────────────────────
export type NotificationType = "apply" | "goal" | "skill" | "general";

export async function listNotifications(userId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("notifications")
    .select(NOTIF_COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}

/** Bulk-insert generated nudges; returns the inserted rows (with ids). */
export async function insertNotifications(
  userId: string,
  items: { message: string; type: string; action?: unknown }[]
) {
  const supabase = createAdminClient();
  const rows = items.map((n) => ({
    user_id: userId,
    message: n.message,
    type: n.type,
    action: n.action ?? null,
  }));
  return supabase.from("notifications").insert(rows).select(NOTIF_COLS);
}

export async function markNotificationRead(id: string, userId: string, read = true) {
  const supabase = createAdminClient();
  return supabase
    .from("notifications")
    .update({ read })
    .eq("id", id)
    .eq("user_id", userId)
    .select(NOTIF_COLS)
    .single();
}
