import { getSettings } from "@/lib/settings";
import { getStripe, isDemoPayments } from "@/lib/payments";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveCompanyAction } from "@/app/actions/admin";

export const metadata = { title: "Empresa" };
const labels = { name: "Nombre comercial", legalName: "Razón social", taxId: "NIF", address: "Dirección", email: "Correo de contacto", phone: "Teléfono" } as const;

export default async function Settings() {
  const { company } = await getSettings();
  const checks = [
    { label: "Pagos con Stripe", ok: !!getStripe(), off: isDemoPayments() ? "Modo demostración (pagos simulados)" : "Sin configurar: define STRIPE_SECRET_KEY" },
    { label: "Webhook de Stripe", ok: !!process.env.STRIPE_WEBHOOK_SECRET, off: "Sin configurar: define STRIPE_WEBHOOK_SECRET" },
    { label: "Envío de correos (SMTP)", ok: !!process.env.SMTP_HOST, off: "Sin configurar: los correos solo se escriben en el registro del servidor" },
    { label: "Aviso de nuevos expedientes", ok: !!process.env.ADMIN_NOTIFY_EMAIL, off: "Sin configurar: define ADMIN_NOTIFY_EMAIL" },
  ];
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold">Empresa</h1>
      <p className="mt-2 text-sm text-ink-soft">Estos datos aparecen en el pie de la web y en los textos legales.</p>
      <div className="card mt-6 p-6 shadow-none">
        <ActionForm action={saveCompanyAction} submit="Guardar datos">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <div key={k}>
              <label className="label" htmlFor={k}>{labels[k]}</label>
              <input id={k} name={k} defaultValue={company[k]} required maxLength={200} className="field" />
            </div>
          ))}
        </ActionForm>
      </div>
      <h2 className="mt-10 font-bold">Estado de las integraciones</h2>
      <ul className="card mt-4 divide-y divide-line shadow-none">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
            <span className="font-semibold">{c.label}</span>
            <span className={`text-end font-semibold ${c.ok ? "text-brand-dark" : "text-warn"}`}>{c.ok ? "Activo" : c.off}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
