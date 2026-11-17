import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { safeNext } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { robots: { index: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; token?: string }> }) {
  const { locale } = await params;
  const { next, token } = await searchParams;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return <AuthForm mode="reset" t={t.auth} locale={locale} next={next ? safeNext(next, "") || undefined : undefined} token={token} />;
}
