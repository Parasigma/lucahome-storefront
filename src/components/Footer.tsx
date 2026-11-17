import Link from "next/link";
import { Lock } from "lucide-react";
import type { Dictionary } from "@/i18n/es";
import type { Locale } from "@/lib/locales";
import type { Company } from "@/lib/settings";
import { Logo } from "./Logo";

export function Footer({ locale, t, company }: { locale: Locale; t: Dictionary["common"]; company: Company }) {
  return (
    <footer className="mt-24 bg-ink text-white/75">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed">{t.footerAbout}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/90">
            <Lock size={14} aria-hidden="true" /> {t.securePayment}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.footerService}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a className="hover:text-white" href={`/${locale}#how`}>{t.navHow}</a></li>
            <li><a className="hover:text-white" href={`/${locale}#price`}>{t.navPrice}</a></li>
            <li><a className="hover:text-white" href={`/${locale}#faq`}>{t.navFaq}</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.footerLegal}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href={`/${locale}/legal/terms`}>{t.terms}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/legal/privacy`}>{t.privacy}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/legal/refunds`}>{t.refunds}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.footerContact}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a className="hover:text-white" href={`mailto:${company.email}`}>{company.email}</a></li>
            <li dir="ltr" className="text-start">{company.phone}</li>
            <li>{company.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-wrap justify-between gap-2 py-5 text-xs">
          <span>© {new Date().getFullYear()} {company.legalName} · {company.taxId}</span>
          <span>{t.rights}</span>
        </div>
      </div>
    </footer>
  );
}
