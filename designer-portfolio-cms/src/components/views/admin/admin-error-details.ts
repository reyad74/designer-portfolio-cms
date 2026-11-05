/**
 * Helper for surfacing DRF validation errors.
 *
 * The shared api client (`src/services/api.ts`) collapses every error envelope
 * into `ApiError(json.error, status)` — for 422 responses that means the useful
 * `details` array is lost and the user only sees "Validation failed".
 *
 * Since a 422 means the server REJECTED the request, re-issuing the identical
 * request once is safe (it will be rejected again) and lets us read the
 * `details` field to show the non-technical user exactly what to fix.
 */
import { ApiError } from "@/services/api";

function flattenDetails(details: unknown): string[] {
  if (!details) return [];
  if (typeof details === "string") return [details];
  if (Array.isArray(details)) {
    return details.flatMap((d) => {
      if (typeof d === "string") return [d];
      if (d && typeof d === "object") {
        const obj = d as Record<string, unknown>;
        // Media-in-use style reference: {type, id, name, field}
        if (typeof obj.type === "string" && typeof obj.name === "string") {
          const field = typeof obj.field === "string" ? ` (${obj.field})` : "";
          return [`in use by ${obj.type} "${obj.name}"${field}`];
        }
        const field = typeof obj.field === "string" ? obj.field : "";
        const message =
          typeof obj.message === "string"
            ? obj.message
            : typeof obj.detail === "string"
              ? obj.detail
              : "";
        if (message) return [field ? `${field}: ${message}` : message];
        return flattenDetails(obj);
      }
      return [String(d)];
    });
  }
  if (typeof details === "object") {
    return Object.entries(details as Record<string, unknown>).flatMap(([field, value]) => {
      const msgs = Array.isArray(value)
        ? value.map((v) => (typeof v === "string" ? v : String(v)))
        : typeof value === "string"
          ? [value]
          : flattenDetails(value);
      return msgs.map((m) => `${field}: ${m}`);
    });
  }
  return [String(details)];
}

async function fetchValidationDetails(path: string, init?: RequestInit): Promise<string[]> {
  try {
    const res = await fetch(path, { ...init, cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { details?: unknown } | null;
    return flattenDetails(json?.details);
  } catch {
    return [];
  }
}

export function isValidationError(e: unknown): e is ApiError {
  return e instanceof ApiError && e.status === 422;
}

/**
 * Build a human-readable error message. For 422 (validation) and 409
 * (e.g. media still in use) the server envelope carries a `details` array
 * that the shared client drops — re-issues the identical request once to
 * recover it and joins it into one message.
 */
export async function describeMutationError(
  e: unknown,
  path?: string,
  init?: RequestInit
): Promise<string> {
  const fallback = e instanceof Error ? e.message : "Request failed";
  if (path && e instanceof ApiError && (e.status === 422 || e.status === 409)) {
    const details = await fetchValidationDetails(path, init);
    if (details.length) return `${fallback} — ${details.join(" · ")}`;
  }
  return fallback;
}
