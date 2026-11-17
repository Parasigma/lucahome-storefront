import Link from "next/link";
import { cookies } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";

export default async function NotFound() {
  const saved = (await cookies()).get("rt_locale")?.value;
  const locale = isLocale(saved) ? saved : defaultLocale;
  const t = (await getDictionary(locale)).common;
  return (
    <div className="container-x py-28 text-center">
      <p className="text-sm font-extrabold text-brand">404</p>
      <h1 className="mt-3 text-3xl font-extrabold">{t.notFoundTitle}</h1>
      <p className="mt-3 text-ink-soft">{t.notFoundText}</p>
      <Link href={`/${locale}`} className="btn-primary mt-8">{t.backHome}</Link>
    </div>
  );
}
