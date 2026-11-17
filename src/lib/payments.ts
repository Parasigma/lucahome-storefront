import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

/** Modo demo: pago simulado. Solo se activa de forma explícita y nunca si hay clave de Stripe. */
export const isDemoPayments = () => !process.env.STRIPE_SECRET_KEY && process.env.PAYMENTS_DEMO === "true";

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
