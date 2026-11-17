"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getStripe } from "@/lib/payments";
import { notifyCustomer } from "@/lib/orders";
import { readStored } from "@/lib/storage";
import { editableSections, getBaseDictionary } from "@/lib/content";
import { isLocale } from "@/lib/locales";
import { defaultCompany } from "@/lib/settings";

export type AdminState = { ok?: string; error?: string };

const euros = z
  .string()
  .trim()
  .regex(/^\d{1,6}([.,]\d{1,2})?$/)
  .transform((v) => Math.round(parseFloat(v.replace(",", ".")) * 100));

export async function savePricingAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ feeCents: euros, serviceCents: euros, taxesCents: euros, vatRate: z.coerce.number().min(0).max(30) })
    .safeParse({ feeCents: fd.get("fee"), serviceCents: fd.get("service"), taxesCents: fd.get("taxes"), vatRate: fd.get("vatRate") });
  if (!parsed.success) return { error: "Revisa los importes: usa números con hasta dos decimales." };
  if (parsed.data.feeCents + parsed.data.serviceCents < 50) return { error: "El precio total es demasiado bajo para poder cobrarse." };
  await db.setting.upsert({ where: { key: "pricing" }, create: { key: "pricing", value: parsed.data }, update: { value: parsed.data } });
  revalidateTag("settings", { expire: 0 });
  await audit(admin.email, "pricing.update", JSON.stringify(parsed.data));
  return { ok: "Precios guardados. Se aplican a los nuevos pedidos." };
}

export async function saveCompanyAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const shape = Object.fromEntries(Object.keys(defaultCompany).map((k) => [k, z.string().trim().min(1).max(200)]));
  const parsed = z.object(shape).safeParse(Object.fromEntries(Object.keys(defaultCompany).map((k) => [k, fd.get(k)])));
  if (!parsed.success) return { error: "Completa todos los campos." };
  await db.setting.upsert({ where: { key: "company" }, create: { key: "company", value: parsed.data }, update: { value: parsed.data } });
  revalidateTag("settings", { expire: 0 });
  await audit(admin.email, "company.update");
  return { ok: "Datos de la empresa guardados." };
}

export async function saveContentAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const locale = String(fd.get("locale"));
  const section = String(fd.get("section")) as (typeof editableSections)[number];
  if (!isLocale(locale) || !editableSections.includes(section)) return { error: "Sección no válida." };
  const base = (await getBaseDictionary(locale))[section] as Record<string, string>;
  const ops = [];
  for (const key of Object.keys(base)) {
    const value = String(fd.get(`f:${key}`) ?? "").replace(/\r\n/g, "\n").trim().slice(0, 5000);
    const id = { locale_section_key: { locale, section, key } };
    if (!value || value === base[key]) ops.push(db.contentOverride.deleteMany({ where: { locale, section, key } }));
    else ops.push(db.contentOverride.upsert({ where: id, create: { locale, section, key, value }, update: { value } }));
  }
  await db.$transaction(ops);
  revalidateTag("content", { expire: 0 });
  await audit(admin.email, "content.update", `${locale}/${section}`);
  return { ok: "Contenido publicado." };
}

export async function saveNotesAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("orderId"));
  await db.order.update({ where: { id }, data: { adminNotes: String(fd.get("adminNotes") ?? "").slice(0, 5000) } });
  revalidatePath(`/admin/orders/${id}`);
}

/** Marca el expediente como presentado y envía el justificante por correo al cliente. */
export async function completeOrderAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(fd.get("orderId"));
  const receipts = await db.document.findMany({ where: { orderId: id, kind: "RECEIPT" } });
  if (receipts.length === 0) return { error: "Sube primero el justificante en PDF." };
  const res = await db.order.updateMany({ where: { id, status: "IN_REVIEW" }, data: { status: "COMPLETED", completedAt: new Date() } });
  if (res.count !== 1) return { error: "El expediente no está en gestión." };
  const attachments = await Promise.all(
    receipts.map(async (r) => ({ filename: r.filename, content: await readStored(r.storedName), contentType: r.mime })),
  );
  await notifyCustomer(id, "completed", attachments);
  await audit(admin.email, "order.complete", id);
  revalidatePath(`/admin/orders/${id}`);
  return { ok: "Expediente completado y justificante enviado al cliente." };
}

export async function refundOrderAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(fd.get("orderId"));
  const order = await db.order.findUnique({ where: { id } });
  if (!order || !["PAID", "IN_REVIEW", "COMPLETED"].includes(order.status)) return { error: "Este expediente no se puede reembolsar." };
  if (!order.demo) {
    const stripe = getStripe();
    if (!stripe || !order.stripePaymentIntentId) return { error: "No hay un pago de Stripe asociado a este expediente." };
    try {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId }, { idempotencyKey: `refund-${order.id}` });
    } catch (e) {
      console.error("[stripe] error en el reembolso", e);
      return { error: "Stripe ha rechazado el reembolso. Revisa el pago en el panel de Stripe." };
    }
  }
  const res = await db.order.updateMany({ where: { id, status: { not: "REFUNDED" } }, data: { status: "REFUNDED", refundedAt: new Date() } });
  if (res.count === 1) await notifyCustomer(id, "refunded");
  await audit(admin.email, "order.refund", order.reference);
  revalidatePath(`/admin/orders/${id}`);
  return { ok: "Reembolso realizado y cliente avisado." };
}

export async function cancelOrderAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(fd.get("orderId"));
  const res = await db.order.updateMany({ where: { id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
  if (res.count !== 1) return { error: "Solo se pueden cancelar expedientes sin pagar." };
  await audit(admin.email, "order.cancel", id);
  revalidatePath(`/admin/orders/${id}`);
  return { ok: "Expediente cancelado." };
}

export async function setRoleAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(fd.get("userId"));
  const role = fd.get("role") === "ADMIN" ? "ADMIN" : "USER";
  if (userId === admin.id) return { error: "No puedes cambiar tu propio rol." };
  const user = await db.user.update({ where: { id: userId }, data: { role } });
  // Al cambiar permisos se cierran las sesiones del usuario afectado.
  await db.session.deleteMany({ where: { userId } });
  await audit(admin.email, "user.role", `${user.email} → ${role}`);
  revalidatePath("/admin/users");
  return { ok: "Rol actualizado." };
}

export async function adminLogoutAction() {
  const { destroySession } = await import("@/lib/auth");
  await destroySession();
  redirect("/");
}
