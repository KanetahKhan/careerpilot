/**
 * ── Tracker service (applications + goals) ──────────────────────────────────
 *
 * Responsibility: persistence and queries for the Progress Tracker — the Kanban
 * application pipeline and the goals/to-dos. Centralizes all data access so the
 * applications/ and goals/ API routes stay thin controllers.
 *
 * Public API:
 *   Applications · listApplications() · createApplication(input)
 *               · updateApplicationStatus(id, status)
 *   Goals       · listGoals() · createGoal(title, dueDate?) · setGoalDone(id, done)
 *   Events      · listEvents() · createEvent(input) · deleteEvent(id)
 *   Nudges      · listNotifications() · markNotificationRead(id) · generateNudges()
 *
 * Inputs:  application/goal/event payloads + ids.
 * Outputs: Supabase query results ({ data, error }).
 * Depends on: core lib/supabase (applications, goals, events, notifications) +
 *             lib/ai (one LLM call for nudge generation, with Groq fallback).
 */
export {
  listApplications,
  createApplication,
  updateApplicationStatus,
  listGoals,
  createGoal,
  setGoalDone,
  listEvents,
  createEvent,
  deleteEvent,
  listNotifications,
  markNotificationRead,
  type ApplicationStatus,
  type NewApplication,
  type EventType,
  type NewEvent,
  type NotificationType,
} from "./tracker";
export { generateNudges } from "./nudges";
