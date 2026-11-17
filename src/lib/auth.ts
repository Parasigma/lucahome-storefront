import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { defaultLocale, isLocale } from "./locales";

const COOKIE = "rt_session";
const SESSION_DAYS = 30;

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
// Hash de relleno para igualar tiempos cuando el usuario no existe (evita enumeración por tiempo).
export const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8xY1QF6c8sWlKqgY0bGZ5C3s1q5p9e";

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, locale: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser(locale: string, next?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const q = next ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/${isLocale(locale) ? locale : defaultLocale}/login${q}`);
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect(`/${defaultLocale}/login?next=/admin`);
  if (user.role !== "ADMIN") redirect(`/${defaultLocale}`);
  return user;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Solo permite redirecciones internas (evita open redirect). */
export function safeNext(next: unknown, fallback: string) {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
