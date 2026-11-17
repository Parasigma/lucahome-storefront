import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import type { Locale } from "./locales";
import type { Dictionary } from "@/i18n/es";

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  es: () => import("@/i18n/es"),
  en: () => import("@/i18n/en"),
  fr: () => import("@/i18n/fr"),
  it: () => import("@/i18n/it"),
  ru: () => import("@/i18n/ru"),
  ar: () => import("@/i18n/ar"),
};

/** Secciones editables desde el panel de administración. */
export const editableSections = ["home", "common", "legal"] as const;
export type EditableSection = (typeof editableSections)[number];

export async function getBaseDictionary(locale: Locale): Promise<Dictionary> {
  return (await loaders[locale]()).default;
}

const getOverrides = unstable_cache(
  async (locale: string) =>
    db.contentOverride.findMany({ where: { locale }, select: { section: true, key: true, value: true } }),
  ["content-overrides"],
  { tags: ["content"], revalidate: 300 },
);

/** Diccionario del idioma con los textos personalizados desde el panel aplicados encima. */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const base = await getBaseDictionary(locale);
  const overrides = await getOverrides(locale).catch(() => []);
  if (!overrides.length) return base;
  const merged = structuredClone(base) as unknown as Record<string, Record<string, string>>;
  for (const o of overrides) {
    if (merged[o.section] && o.key in merged[o.section] && o.value.trim()) merged[o.section][o.key] = o.value;
  }
  return merged as unknown as Dictionary;
}
