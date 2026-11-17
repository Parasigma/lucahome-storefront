import type { Dictionary } from "@/i18n/es";
import { fill, formatMoney, type Locale } from "@/lib/locales";

type Amounts = { feeCents: number; serviceCents: number; taxesCents: number; vatCents: number; totalCents: number; vatRate?: number };

export function PriceBreakdown({ t, locale, a, dark = false, hints = true }: { t: Dictionary["home"]; locale: Locale; a: Amounts; dark?: boolean; hints?: boolean }) {
  const sub = dark ? "text-white/60" : "text-muted";
  const rows = [
    { label: t.priceFee, hint: t.priceFeeHint, cents: a.feeCents },
    { label: t.priceService, hint: t.priceServiceHint, cents: a.serviceCents },
    { label: t.priceTaxes, hint: t.priceTaxesHint, cents: a.taxesCents },
    {
      label: a.vatRate === undefined ? t.priceVat.replace(/\s*\(.*\)/, "") : fill(t.priceVat, { rate: a.vatRate }),
      hint: "",
      cents: a.vatCents,
    },
  ];
  return (
    <dl>
      {rows.map((r) => (
        <div key={r.label} className={`flex items-start justify-between gap-6 border-b py-3.5 ${dark ? "border-white/10" : "border-line"}`}>
          <dt>
            <span className="text-sm font-semibold">{r.label}</span>
            {hints && r.hint && <span className={`mt-0.5 block text-xs ${sub}`}>{r.hint}</span>}
          </dt>
          <dd className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(r.cents, locale)}</dd>
        </div>
      ))}
      <div className="flex items-end justify-between gap-6 pt-5">
        <dt className="text-sm font-bold">{t.priceTotal}</dt>
        <dd className="text-4xl font-extrabold tracking-tight tabular-nums">{formatMoney(a.totalCents, locale)}</dd>
      </div>
    </dl>
  );
}
