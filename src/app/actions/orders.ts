"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { appUrl, getStripe, isDemoPayments } from "@/lib/payments";
import { getBaseDictionary } from "@/lib/content";
import { defaultLocale, isLocale, type Locale } from "@/lib/locales";
import { SLA_HOURS, markOrderPaid, newReference, notifyAdminsNewSubmission, notifyCustomer } from "@/lib/orders";
import { deleteStored } from "@/lib/storage";

export type OrderState = { error?: "unavailable" | "errFields" | "errNoDocs" | "errGeneric" };

const stripeLocales = ["es", "en", "fr", "it", "ru"];

async function stripeUrlFor(order: { id: string; reference: string; feeCents: number; serviceCents: number; taxesCents: number; vatCents: number }, locale: Locale, email: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  const t = await getBaseDictionary(locale);
  const item = (name: string, cents: number) => ({
    quantity: 1,
    price_data: { currency: "eur", unit_amount: cents, product_data: { name } },
  });
  const line_items = [
    item(`${t.checkout.productName} — ${t.home.priceFee}`, order.feeCents),
    item(t.home.priceService, order.serviceCents),
    item(t.home.priceTaxes, order.taxesCents),
    item(t.home.priceVat.replace(/\s*\(.*\)/, ""), order.vatCents),
  ].filter((i) => i.price_data.unit_amount > 0);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    customer_email: email,
    client_reference_id: order.id,
    metadata: { orderId: order.id, reference: order.reference },
    payment_intent_data: { metadata: { orderId: order.id, reference: order.reference } },
    locale: (stripeLocales.includes(locale) ? locale : "auto") as Stripe.Checkout.SessionCreateParams.Locale,
    success_url: `${appUrl()}/${locale}/account/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/${locale}/checkout?cancelled=1`,
  });
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return session.url;
}

/** Crea el pedido con el precio vigente (calculado en servidor) y lleva al pago. */
export async function startCheckoutAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const l = String(fd.get("locale") ?? "");
  const locale = isLocale(l) ? l : defaultLocale;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/register?next=/${locale}/checkout`);
  if (!(await rateLimit(`checkout:${user.id}`, 10, 3600))) return { error: "unavailable" };
  if (!getStripe() && !isDemoPayments()) return { error: "unavailable" };

  const { pricing } = await getSettings();
  const existingId = String(fd.get("orderId") ?? "");
  let order = existingId
    ? await db.order.findFirst({ where: { id: existingId, userId: user.id, status: "PENDING_PAYMENT" } })
    : null;
  order ??= await db.order.create({
    data: {
      reference: newReference(),
      userId: user.id,
      locale,
      feeCents: pricing.feeCents,
      serviceCents: pricing.serviceCents,
      taxesCents: pricing.taxesCents,
      vatCents: pricing.vatCents,
      totalCents: pricing.totalCents,
      fullName: user.name,
      demo: isDemoPayments(),
    },
  });

  let url: string | null;
  if (isDemoPayments()) {
    await markOrderPaid(order.id);
    url = `/${locale}/account/orders/${order.id}`;
  } else {
    try {
      url = await stripeUrlFor(order, locale, user.email);
    } catch (e) {
      console.error("[stripe] error creando la sesión de pago", e);
      return { error: "unavailable" };
    }
  }
  if (!url) return { error: "unavailable" };
  redirect(url);
}

const details = z.object({
  fullName: z.string().trim().min(2).max(160),
  taxId: z.string().trim().min(4).max(40),
  country: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
  comments: z.string().trim().max(2000).optional(),
});

/** Guarda los datos del titular y envía el expediente: arranca el plazo de 24 h. */
export async function submitOrderAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const user = await getCurrentUser();
  const id = String(fd.get("orderId") ?? "");
  if (!user) return { error: "errGeneric" };
  const parsed = details.safeParse(Object.fromEntries(["fullName", "taxId", "country", "phone", "comments"].map((k) => [k, fd.get(k) ?? undefined])));
  if (!parsed.success) return { error: "errFields" };
  const docs = await db.document.count({ where: { orderId: id, kind: "CUSTOMER", order: { userId: user.id } } });
  if (docs === 0) return { error: "errNoDocs" };

  const now = new Date();
  const res = await db.order.updateMany({
    where: { id, userId: user.id, status: "PAID" },
    data: { ...parsed.data, status: "IN_REVIEW", submittedAt: now, dueAt: new Date(now.getTime() + SLA_HOURS * 3600_000) },
  });
  if (res.count !== 1) return { error: "errGeneric" };
  await Promise.all([notifyCustomer(id, "submitted"), notifyAdminsNewSubmission(id)]);
  revalidatePath(`/[locale]/account/orders/${id}`, "page");
  return {};
}

export async function deleteDocumentAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const doc = await db.document.findFirst({
    where: { id: String(fd.get("docId")), kind: "CUSTOMER", order: { userId: user.id, status: "PAID" } },
  });
  if (!doc) return;
  await db.document.delete({ where: { id: doc.id } });
  await deleteStored(doc.storedName);
  revalidatePath(`/[locale]/account/orders/${doc.orderId}`, "page");
}
