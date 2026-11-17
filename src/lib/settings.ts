import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";

export type Pricing = {
  feeCents: number; // honorarios profesionales
  serviceCents: number; // servicio de gestión y presentación
  taxesCents: number; // tasas y gastos de tramitación (sin IVA)
  vatRate: number; // % de IVA sobre honorarios + servicio
};
export type Company = {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
};

export const defaultPricing: Pricing = { feeCents: 4000, serviceCents: 1000, taxesCents: 450, vatRate: 21 };
export const defaultCompany: Company = {
  name: "Rapid Tax",
  legalName: "Rapid Tax, S.L.",
  taxId: "B-00000000",
  address: "Calle Ejemplo 1, 28001 Madrid, España",
  email: "hola@rapidtax.example",
  phone: "+34 900 000 000",
};

export function computeTotals(p: Pricing) {
  const vatCents = Math.round(((p.feeCents + p.serviceCents) * p.vatRate) / 100);
  return { ...p, vatCents, totalCents: p.feeCents + p.serviceCents + p.taxesCents + vatCents };
}

export const getSettings = unstable_cache(
  async () => {
    const rows = await db.setting.findMany({ where: { key: { in: ["pricing", "company"] } } });
    const get = (k: string) => (rows.find((r) => r.key === k)?.value ?? {}) as object;
    const pricing = { ...defaultPricing, ...get("pricing") } as Pricing;
    const company = { ...defaultCompany, ...get("company") } as Company;
    return { pricing: computeTotals(pricing), company };
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 },
);
