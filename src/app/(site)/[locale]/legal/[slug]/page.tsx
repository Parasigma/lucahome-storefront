import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";

const pages = { terms: "termsBody", privacy: "privacyBody", refunds: "refundsBody" } as const;

export default async function Legal({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !(slug in pages)) notFound();
  const t = await getDictionary(locale);
  const key = slug as keyof typeof pages;
  return (
    <article className="container-x max-w-3xl py-16">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t.common[key]}</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
        {t.legal[pages[key]].split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
