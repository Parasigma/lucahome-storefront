import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";
import { getBaseDictionary } from "./content";
import { sendMail } from "./mail";
import { appUrl } from "./payments";
import { dirOf, fill, formatDateTime, isLocale, defaultLocale } from "./locales";

export const SLA_HOURS = 24;

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function newReference() {
  let s = "RT-";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

type Kind = "paid" | "submitted" | "completed" | "refunded";

export async function notifyCustomer(
  orderId: string,
  kind: Kind,
  attachments?: { filename: string; content: Buffer; contentType: string }[],
) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) return;
  const locale = isLocale(order.locale) ? order.locale : defaultLocale;
  const t = (await getBaseDictionary(locale)).email;
  const vars = {
    ref: order.reference,
    name: order.user.name,
    date: order.dueAt ? formatDateTime(order.dueAt, locale) : "",
  };
  const url = `${appUrl()}/${locale}/account/orders/${order.id}`;
  await sendMail({
    to: order.user.email,
    subject: fill(t[`${kind}Subject`], vars),
    heading: fill(t.greeting, vars),
    body: fill(t[`${kind}Body`], vars),
    cta: { label: kind === "paid" ? t.paidCta : t.viewOrder, url },
    signature: t.signature,
    rtl: dirOf(locale) === "rtl",
    attachments,
  });
}

/** Marca un pedido como pagado. Idempotente: webhook y página de retorno pueden llamarla a la vez. */
export async function markOrderPaid(orderId: string, paymentIntentId?: string | null) {
  const res = await db.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: paymentIntentId ?? undefined },
  });
  if (res.count === 1) await notifyCustomer(orderId, "paid");
  return res.count === 1;
}

export async function notifyAdminsNewSubmission(orderId: string) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!to || !order) return;
  await sendMail({
    to,
    subject: `Nuevo expediente para gestionar · ${order.reference}`,
    heading: "Nuevo expediente con documentación completa",
    body: `El cliente ${order.fullName ?? ""} ha enviado su documentación.\n\nPlazo límite de presentación: ${order.dueAt ? formatDateTime(order.dueAt, "es") : "-"}.`,
    cta: { label: "Abrir en el panel", url: `${appUrl()}/admin/orders/${order.id}` },
  });
}
