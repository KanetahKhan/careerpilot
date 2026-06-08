import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";

/**
 * Shared API plumbing so every route validates input and reports errors the same
 * way. The response envelope is intentionally unchanged from the rest of the app:
 * success returns the route's own JSON, errors return `{ error: string }` with the
 * correct status code. Generalizes the zod + try/catch pattern already used in
 * app/api/apply and app/api/fit/tailor.
 */

/** A throwable error that carries the HTTP status to return. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Uniform error response: `{ error: message }` at the given status. */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const MAX_JSON_BYTES = 1_048_576; // 1 MB

/**
 * Parse + validate a JSON request body against a zod schema.
 * Rejects bodies over 1 MB (413) before reading, then throws ApiError(400) on
 * malformed JSON or a schema violation. `route()` translates these into responses.
 */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_JSON_BYTES) throw new ApiError("Request body too large", 413);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }
  return parsed.data;
}

type Handler<A extends unknown[]> = (...args: A) => Promise<Response> | Response;

/**
 * Wrap a route handler so thrown errors become consistent responses:
 *   - ApiError                  → its own status
 *   - requireUser's Unauthorized → 401
 *   - provider rate-limit (429)  → AI_BUSY_MESSAGE
 *   - anything else              → 500 (logged, generic message — no internals leaked)
 * A successful handler's Response (including streams) is returned untouched.
 */
export function route<A extends unknown[]>(handler: Handler<A>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof ApiError) return jsonError(e.message, e.status);
      const msg = String((e as Error)?.message ?? "");
      if (msg === "Unauthorized") return jsonError("Unauthorized", 401);
      if (isRateLimitError(e)) return jsonError(AI_BUSY_MESSAGE, 429);
      console.error("API route error:", e);
      return jsonError("Something went wrong — please try again.", 500);
    }
  };
}
