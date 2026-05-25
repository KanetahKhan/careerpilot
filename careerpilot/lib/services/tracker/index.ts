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
 *
 * Inputs:  application/goal/event payloads + ids.
 * Outputs: Supabase query results ({ data, error }).
 * Depends on: core lib/supabase (applications, goals, events tables).
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
  type ApplicationStatus,
  type NewApplication,
  type EventType,
  type NewEvent,
} from "./tracker";
