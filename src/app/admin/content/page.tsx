import Link from "next/link";
import { db } from "@/lib/db";
import { editableSections, getBaseDictionary, type EditableSection } from "@/lib/content";
import { defaultLocale, dirOf, isLocale, localeNames, locales } from "@/lib/locales";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveContentAction } from "@/app/actions/admin";

export const metadata = { title: "Contenido" };
const sectionNames: Record<EditableSection, string> = { home: "Página de inicio", common: "Menú y pie", legal: "Textos legales" };

export default async function Content({ searchParams }: { searchParams: Promise<{ locale?: string; section?: string }> }) {
  const sp = await searchParams;
  const locale = isLocale(sp.locale) ? sp.locale : defaultLocale;
  const section = editableSections.includes(sp.section as EditableSection) ? (sp.section as EditableSection) : "home";
  const [base, es, overrides] = await Promise.all([
    getBaseDictionary(locale),
    getBaseDictionary("es"),
    db.contentOverride.findMany({ where: { locale, section } }),
  ]);
  const fields = base[section] as Record<string, string>;
  const ref = es[section] as Record<string, string>;
  const current = Object.fromEntries(overrides.map((o) => [o.key, o.value]));
  const tab = (active: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-ink text-white" : "border border-line bg-white text-ink-soft"}`;
  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Contenido</h1>
        <a href={`/${locale}`} target="_blank" className="btn-ghost py-2">Ver la web en {localeNames[locale]}</a>
      </div>
      <p className="mt-2 text-sm text-ink-soft">Edita los textos de la web en cada idioma. Los cambios se publican al guardar; deja un campo como estaba para mantener el texto original.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {locales.map((l) => <Link key={l} href={`/admin/content?locale=${l}&section=${section}`} className={tab(l === locale)}>{localeNames[l]}</Link>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {editableSections.map((s) => <Link key={s} href={`/admin/content?locale=${locale}&section=${s}`} className={tab(s === section)}>{sectionNames[s]}</Link>)}
      </div>
      <div className="card mt-6 p-6 shadow-none">
        <ActionForm key={`${locale}-${section}`} action={saveContentAction} submit="Publicar cambios" className="space-y-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="section" value={section} />
          {Object.entries(fields).map(([key, original]) => {
            const value = current[key] ?? original;
            const long = value.length > 90 || original.includes("\n");
            return (
              <div key={key}>
                <label className="label flex items-center gap-2" htmlFor={`f:${key}`}>
                  <code className="rounded bg-paper px-1.5 py-0.5 text-xs font-semibold text-ink-soft">{key}</code>
                  {current[key] && <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">Personalizado</span>}
                </label>
                {long ? (
                  <textarea id={`f:${key}`} name={`f:${key}`} defaultValue={value} rows={original.includes("\n") ? 10 : 3} dir={dirOf(locale)} className="field" />
                ) : (
                  <input id={`f:${key}`} name={`f:${key}`} defaultValue={value} dir={dirOf(locale)} className="field" />
                )}
                {locale !== "es" && <p className="mt-1 line-clamp-2 text-xs text-muted">ES: {ref[key]}</p>}
              </div>
            );
          })}
        </ActionForm>
      </div>
    </div>
  );
}
