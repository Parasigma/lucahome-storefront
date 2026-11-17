import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-arabic";
import "../../globals.css";
import { dirOf, isLocale, locales } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { appUrl, isDemoPayments } from "@/lib/payments";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return {
    metadataBase: new URL(appUrl()),
    title: { default: t.home.metaTitle, template: "%s · Rapid Tax" },
    description: t.home.metaDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { title: t.home.metaTitle, description: t.home.metaDescription, siteName: "Rapid Tax", type: "website", locale },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, settings] = await Promise.all([getDictionary(locale), getSettings()]);
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="flex min-h-screen flex-col">
        {isDemoPayments() && (
          <div className="bg-warn px-4 py-1.5 text-center text-xs font-semibold text-white">{t.common.demoBanner}</div>
        )}
        <Header locale={locale} t={t.common} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} t={t.common} company={settings.company} />
      </body>
    </html>
  );
}
