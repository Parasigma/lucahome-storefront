"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  DUMMY_HASH, clientIp, createSession, destroySession, hashPassword, newToken, safeNext, sha256, verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { defaultLocale, dirOf, isLocale } from "@/lib/locales";
import { getBaseDictionary } from "@/lib/content";
import { sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/payments";
import { audit } from "@/lib/audit";

export type AuthState = { error?: "errInvalid" | "errExists" | "errFields" | "errTerms" | "errRate" | "errToken"; ok?: boolean };

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(10).max(200);
const loc = (fd: FormData) => {
  const l = String(fd.get("locale") ?? "");
  return isLocale(l) ? l : defaultLocale;
};

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = loc(fd);
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 3600))) return { error: "errRate" };
  const parsed = z
    .object({ name: z.string().trim().min(2).max(120), email, password })
    .safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "errFields" };
  if (fd.get("terms") !== "on") return { error: "errTerms" };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { error: "errExists" };
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), locale },
  });
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), `/${locale}/account`));
}

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = loc(fd);
  const ip = await clientIp();
  const parsed = z.object({ email, password: z.string().min(1).max(200) }).safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "errInvalid" };
  const okIp = await rateLimit(`login:ip:${ip}`, 20, 900);
  const okUser = await rateLimit(`login:user:${parsed.data.email}`, 8, 900);
  if (!okIp || !okUser) return { error: "errRate" };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "errInvalid" };
  await createSession(user.id);
  if (user.role === "ADMIN") await audit(user.email, "login.admin", ip);
  redirect(safeNext(fd.get("next"), user.role === "ADMIN" ? "/admin" : `/${locale}/account`));
}

export async function logoutAction(fd: FormData) {
  await destroySession();
  redirect(`/${loc(fd)}`);
}

export async function forgotAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = loc(fd);
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 3600))) return { error: "errRate" };
  const parsed = email.safeParse(fd.get("email"));
  if (parsed.success) {
    const user = await db.user.findUnique({ where: { email: parsed.data } });
    if (user) {
      const token = newToken();
      await db.passwordReset.create({
        data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
      });
      const t = (await getBaseDictionary(locale)).email;
      await sendMail({
        to: user.email,
        subject: t.resetSubject,
        heading: t.greeting.replace("{name}", user.name),
        body: t.resetBody,
        cta: { label: t.resetCta, url: `${appUrl()}/${locale}/reset?token=${token}` },
        signature: t.signature,
        rtl: dirOf(locale) === "rtl",
      });
    }
  }
  // Misma respuesta exista o no la cuenta (no revela qué correos están registrados).
  return { ok: true };
}

export async function resetAction(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!(await rateLimit(`reset:${await clientIp()}`, 10, 3600))) return { error: "errRate" };
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: "errFields" };
  const token = String(fd.get("token") ?? "");
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "errToken" };
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(pw.data) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    // Cierra todas las sesiones abiertas al cambiar la contraseña.
    db.session.deleteMany({ where: { userId: reset.userId } }),
  ]);
  return { ok: true };
}
