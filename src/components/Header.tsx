import Link from "next/link";
import { Menu } from "lucide-react";
import type { Dictionary } from "@/i18n/es";
import type { Locale } from "@/lib/locales";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Header({ locale, t }: { locale: Locale; t: Dictionary["common"] }) {
  const user = await getCurrentUser();
  const nav = [
    { href: `/${locale}#how`, label: t.navHow },
    { href: `/${locale}#price`, label: t.navPrice },
    { href: `/${locale}#guarantee`, label: t.navGuarantee },
    { href: `/${locale}#faq`, label: t.navFaq },
  ];
  const userLinks = user ? (
    <>
      {user.role === "ADMIN" && (
        // Enlace completo a propósito: el panel usa otro layout raíz.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/admin" className="btn-ghost">
          {t.admin}
        </a>
      )}
      <Link href={`/${locale}/account`} className="btn-ghost">
        {t.account}
      </Link>
      <form action={logoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button className="btn px-3 text-ink-soft hover:text-ink">{t.logout}</button>
      </form>
    </>
  ) : (
    <>
      <Link href={`/${locale}/login`} className="btn px-3 text-ink-soft hover:text-ink">
        {t.login}
      </Link>
      <Link href={`/${locale}/checkout`} className="btn-primary">
        {t.start}
      </Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} aria-label="Rapid Tax">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-soft lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={t.language} />
          <div className="hidden items-center gap-2 md:flex">{userLinks}</div>
          <details className="relative md:hidden">
            <summary className="btn-ghost cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <Menu size={18} />
            </summary>
            <div className="card absolute end-0 top-full mt-2 flex w-60 flex-col gap-1 p-3">
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-paper">
                  {n.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">{userLinks}</div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
