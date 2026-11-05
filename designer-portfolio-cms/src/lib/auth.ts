import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { HttpError } from "./api-response";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-change-in-production-9f2c1b"
);
export const ADMIN_COOKIE = "av_admin_token";
const ACCESS_TTL = "2h";

export type AdminPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signAdminToken(payload: AdminPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(SECRET);
}

export async function verifyAdminToken(token: string): Promise<AdminPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub || !payload.email) throw new Error("bad token");
    return payload as unknown as AdminPayload;
  } catch {
    throw new HttpError("Invalid or expired session", 401);
  }
}

/** Set the httpOnly auth cookie (secure in production). */
export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Server-side session reader for RSC / route handlers using the cookie jar. */
export async function getSessionAdmin(): Promise<AdminPayload | null> {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return null;
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}
