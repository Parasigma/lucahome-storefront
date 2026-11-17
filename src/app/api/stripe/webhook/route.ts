import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/payments";
import { markOrderPaid, notifyCustomer } from "@/lib/orders";

const piId = (v: string | Stripe.PaymentIntent | null) => (typeof v === "string" ? v : (v?.id ?? null));

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) return new NextResponse("Webhook no configurado", { status: 400 });

  let event: Stripe.Event;
  try {
    // La firma garantiza que el aviso viene de Stripe y no ha sido manipulado.
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new NextResponse("Firma no válida", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      const order = await db.order.findUnique({ where: { stripeSessionId: s.id } });
      // Se comprueba el importe cobrado contra el pedido guardado.
      if (order && s.payment_status === "paid" && s.amount_total === order.totalCents) {
        await markOrderPaid(order.id, piId(s.payment_intent));
      }
      break;
    }
    case "charge.refunded": {
      const c = event.data.object;
      const pi = piId(c.payment_intent);
      if (pi && c.refunded) {
        const order = await db.order.findFirst({ where: { stripePaymentIntentId: pi, status: { not: "REFUNDED" } } });
        if (order) {
          await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
          await notifyCustomer(order.id, "refunded");
        }
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
