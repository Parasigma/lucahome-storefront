import { notFound, redirect } from "next/navigation";
import { Lock, Upload } from "lucide-react";
import { fill, formatMoney, isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { isDemoPayments } from "@/lib/payments";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata = { robots: { index: false } };

export default async function Checkout({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ cancelled?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/register?next=/${locale}/checkout`);
  const [dict, { pricing }, { cancelled }] = await Promise.all([getDictionary(locale), getSettings(), searchParams]);
  const t = dict.checkout;
  const amount = formatMoney(pricing.totalCents, locale);
  return (
    <div className="container-x max-w-xl py-14">
      <h1 className="text-3xl font-extrabold">{t.title}</h1>
      <p className="mt-2 text-ink-soft">{t.text}</p>
      {cancelled && <p className="alert-error mt-6">{t.cancelled}</p>}
      <div className="card mt-8 p-7">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{t.summary}</h2>
        <div className="mt-2">
          <PriceBreakdown t={dict.home} locale={locale} a={pricing} />
        </div>
        <div className="mt-7">
          <CheckoutButton locale={locale} label={fill(isDemoPayments() ? t.payDemo : t.pay, { amount })} errorText={t.unavailable} />
        </div>
        <ul className="mt-5 space-y-2 text-xs text-muted">
          <li className="flex items-start gap-2"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.secure}</li>
          <li className="flex items-start gap-2"><Upload size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.after}</li>
        </ul>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-muted">{dict.home.priceNote}</p>
    </div>
  );
}
