import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/locales";
import { ActionForm } from "@/components/admin/ActionForm";
import { savePricingAction } from "@/app/actions/admin";

export const metadata = { title: "Precios" };
const eur = (c: number) => (c / 100).toFixed(2);

export default async function Pricing() {
  const { pricing: p } = await getSettings();
  const fields = [
    { name: "fee", label: "Honorarios profesionales (€, sin IVA)", value: eur(p.feeCents) },
    { name: "service", label: "Servicio de gestión y presentación (€, sin IVA)", value: eur(p.serviceCents) },
    { name: "taxes", label: "Tasas y gastos de tramitación (€, no sujetas a IVA)", value: eur(p.taxesCents) },
    { name: "vatRate", label: "IVA sobre honorarios y servicio (%)", value: String(p.vatRate) },
  ];
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold">Precios</h1>
      <p className="mt-2 text-sm text-ink-soft">El desglose se muestra en la web y en la página de pago. Los cambios solo afectan a pedidos nuevos; los ya creados conservan su importe.</p>
      <div className="card mt-6 p-6 shadow-none">
        <ActionForm action={savePricingAction} submit="Guardar precios">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={f.name}>{f.label}</label>
              <input id={f.name} name={f.name} defaultValue={f.value} inputMode="decimal" required className="field" />
            </div>
          ))}
        </ActionForm>
      </div>
      <div className="card mt-6 flex items-center justify-between p-6 shadow-none">
        <span className="text-sm text-ink-soft">Precio final actual para el cliente (IVA de {formatMoney(p.vatCents, "es")} incluido)</span>
        <span className="text-2xl font-extrabold tabular-nums">{formatMoney(p.totalCents, "es")}</span>
      </div>
    </div>
  );
}
