import { NextResponse } from "next/server";

/** Consistent API envelope: { success, data } | { success:false, error } */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function okList<T>(
  items: T[],
  meta: { page: number; limit: number; total: number; totalPages: number }
) {
  return NextResponse.json({ success: true, data: items, meta });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Wrap a handler so thrown HttpErrors / Zod errors become clean responses. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof HttpError) return fail(err.message, err.status);
    const e = err as { name?: string; issues?: unknown; message?: string };
    if (e?.name === "ZodError") {
      return fail("Validation failed", 422, e.issues);
    }
    console.error("[api]", err);
    return fail("Internal server error", 500);
  });
}
