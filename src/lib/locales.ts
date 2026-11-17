export const locales = ["es", "en", "fr", "it", "ru", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
};

export const isLocale = (v: string | undefined | null): v is Locale =>
  !!v && (locales as readonly string[]).includes(v);

export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

export function formatMoney(cents: number, locale: Locale, currency = "EUR") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDateTime(d: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(d));
}

/** Sustituye {clave} en un texto traducido. */
export function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
