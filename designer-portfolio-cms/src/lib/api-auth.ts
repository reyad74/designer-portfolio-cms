import { getSessionAdmin, type AdminPayload } from "./auth";
import { HttpError } from "./api-response";

/**
 * Backend authorization guard for admin endpoints.
 * Every protected route MUST call this — frontend checks are UX only.
 */
export async function requireAdmin(): Promise<AdminPayload> {
  const admin = await getSessionAdmin();
  if (!admin) throw new HttpError("Authentication required", 401);
  return admin;
}
