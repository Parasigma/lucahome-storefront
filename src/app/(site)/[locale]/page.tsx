import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Check, ChevronDown, Clock, CreditCard, FileCheck2, FileText, Home, KeyRound,
  Lock, Send, ShieldCheck, Upload, Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { PriceBreakdown } from "@/components/PriceBreakdown";

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, { pricing }] = await Promise.all([getDictionary(locale), getSettings()]);
  const t = dict.home;
  const cta = `/${locale}/checkout`;

  const who = [
    { icon: Home, title: t.who1Title, text: t.who1Text },
    { icon: KeyRound, title: t.who2Title, text: t.who2Text },
    { icon: Users, title: t.who3Title, text: t.who3Text },
  ];
  const how = [
    { icon: CreditCard, title: t.how1Title, text: t.how1Text },
    { icon: Upload, title: t.how2Title, text: t.how2Text },
    { icon: FileCheck2, title: t.how3Title, text: t.how3Text },
    { icon: Send, title: t.how4Title, text: t.how4Text },
  ];
  const included = [t.included1, t.included2, t.included3, t.included4, t.included5, t.included6];
  const docs = [t.docs1, t.docs2, t.docs3, t.docs4, t.docs5];
  const faqs = [
    [t.faq1Q, t.faq1A], [t.faq2Q, t.faq2A], [t.faq3Q, t.faq3A],
    [t.faq4Q, t.faq4A], [t.faq5Q, t.faq5A], [t.faq6Q, t.faq6A],
  ];
  const cardSteps = [t.cardStep1, t.cardStep2, t.cardStep3, t.cardStep4];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_80%_-10%,rgba(29,145,79,0.14),transparent),radial-gradient(40rem_24rem_at_0%_20%,rgba(11,29,58,0.06),transparent)]" />
        <div className="container-x grid items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1.5 text-xs font-bold text-brand-dark">
              <BadgeCheck size={14} aria-hidden="true" /> {t.heroBadge}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">{t.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{t.heroText}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={cta} className="btn-brand px-6 py-3.5 text-base">
                {t.heroCta} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" />
              </Link>
              <a href="#price" className="btn-ghost px-6 py-3.5 text-base">{t.heroSecondary}</a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-ink-soft">
              <li className="flex items-center gap-2"><Clock size={16} className="text-brand" aria-hidden="true" /> {t.trust1}</li>
              <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand" aria-hidden="true" /> {t.trust2}</li>
              <li className="flex items-center gap-2"><Lock size={16} className="text-brand" aria-hidden="true" /> {t.trust3}</li>
            </ul>
          </div>

          <div className="card relative mx-auto w-full max-w-md p-7">
            <div className="flex items-center justify-between border-b border-line pb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white"><FileText size={18} aria-hidden="true" /></span>
                <span className="text-sm font-bold">{t.cardTitle}</span>
              </div>
              <span dir="ltr" className="rounded-md bg-paper px-2 py-1 text-[11px] font-bold text-muted">RT-7K2M9QXA</span>
            </div>
            <ol className="relative mt-6 space-y-5">
              <span aria-hidden="true" className="absolute start-[13px] top-2 bottom-2 w-px bg-brand/30" />
              {cardSteps.map((s) => (
                <li key={s} className="relative flex items-center gap-4">
                  <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                  <span className="text-sm font-semibold">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3.5">
              <span className="text-sm font-semibold text-brand-dark">{t.cardFooter}</span>
              <span className="text-sm font-extrabold text-brand-dark">{t.cardTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Para quién */}
      <section className="container-x py-16">
        <p className="kicker">{t.whoKicker}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-4xl">{t.whoTitle}</h2>
        <p className="mt-4 max-w-2xl text-ink-soft">{t.whoText}</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {who.map((w) => (
            <div key={w.title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-dark"><w.icon size={20} aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-bold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="how" className="border-y border-line bg-white py-20">
        <div className="container-x">
          <p className="kicker">{t.howKicker}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold sm:text-4xl">{t.howTitle}</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {how.map((h, i) => (
              <li key={h.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><h.icon size={20} aria-hidden="true" /></span>
                  <span className="text-sm font-extrabold text-brand">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{h.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Qué incluye + precio */}
      <section id="price" className="container-x grid gap-12 py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="kicker">{t.includedKicker}</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t.includedTitle}</h2>
          <ul className="mt-8 space-y-4">
            {included.map((x) => (
              <li key={x} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                <span className="font-medium text-ink-soft">{x}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-2xl border border-line bg-white p-6">
            <p className="kicker">{t.docsKicker}</p>
            <h3 className="mt-2 text-lg font-bold">{t.docsTitle}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {docs.map((d) => (
                <li key={d} className="flex items-start gap-2.5"><FileText size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" /> {d}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="rounded-3xl bg-ink p-8 text-white shadow-card sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{t.priceKicker}</p>
            <h2 className="mt-3 text-2xl font-extrabold">{t.priceTitle}</h2>
            <p className="mt-2 text-sm text-white/70">{t.priceText}</p>
            <div className="mt-6">
              <PriceBreakdown t={t} locale={locale} a={pricing} dark />
            </div>
            <Link href={cta} className="btn-brand mt-8 w-full py-4 text-base">
              {t.priceCta} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/60">
              <Lock size={12} aria-hidden="true" /> {dict.common.securePayment}
            </p>
          </div>
          <p className="mt-5 px-2 text-sm leading-relaxed text-muted">{t.priceNote}</p>
        </div>
      </section>

      {/* Garantía */}
      <section id="guarantee" className="container-x">
        <div className="grid items-center gap-10 rounded-3xl border border-brand/20 bg-brand-soft p-8 sm:p-12 lg:grid-cols-[auto_1fr]">
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand text-white"><ShieldCheck size={48} strokeWidth={1.6} aria-hidden="true" /></span>
          <div>
            <p className="kicker">{t.guaranteeKicker}</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t.guaranteeTitle}</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-ink-soft">{t.guaranteeText}</p>
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold">
              {[t.guarantee1, t.guarantee2, t.guarantee3].map((g) => (
                <li key={g} className="flex items-center gap-2"><Check size={16} strokeWidth={3} className="text-brand-dark" aria-hidden="true" /> {g}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-x max-w-3xl py-20">
        <p className="kicker text-center">{t.faqKicker}</p>
        <h2 className="mt-3 text-center text-3xl font-extrabold sm:text-4xl">{t.faqTitle}</h2>
        <div className="mt-10 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="group card px-6 py-5 shadow-none">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={18} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="container-x">
        <div className="rounded-3xl bg-ink px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{t.finalText}</p>
          <Link href={cta} className="btn-brand mt-8 px-7 py-4 text-base">
            {t.heroCta} <ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
