"use client";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/lib/locales";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ink/30">
      <Globe size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={locale}
        onChange={(e) => {
          // Navegación completa: cambia <html lang/dir> y guarda la preferencia en la cookie.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/${e.target.value}${rest ? `/${rest}` : ""}${window.location.search}`);
        }}
        className="cursor-pointer appearance-none bg-transparent pe-1 focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
