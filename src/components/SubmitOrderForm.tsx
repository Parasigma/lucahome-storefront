"use client";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/es";
import { submitOrderAction, type OrderState } from "@/app/actions/orders";
import { SubmitButton } from "./SubmitButton";

type Values = { fullName: string; taxId: string; country: string; phone: string; comments: string };

export function SubmitOrderForm({ orderId, t, values: initial, children }: { orderId: string; t: Dictionary["account"]; values: Values; children: React.ReactNode }) {
  // Tras un error se conserva lo escrito (React vacía los formularios al terminar la acción).
  const [state, action] = useActionState<OrderState & { values?: Values }, FormData>(
    async (prev, fd) => ({ ...(await submitOrderAction(prev, fd)), values: Object.fromEntries(Object.keys(initial).map((k) => [k, String(fd.get(k) ?? "")])) as Values }),
    {},
  );
  const values = state.values ?? initial;
  const err = state.error && state.error !== "unavailable" ? t[state.error] : null;
  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="orderId" value={orderId} />
      <section className="card p-7">
        <h2 className="text-lg font-bold"><span className="text-brand">1.</span> {t.step1}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="fullName">{t.fullName}</label>
            <input id="fullName" name="fullName" required maxLength={160} defaultValue={values.fullName} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="taxId">{t.taxId}</label>
            <input id="taxId" name="taxId" required maxLength={40} defaultValue={values.taxId} dir="ltr" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="country">{t.country}</label>
            <input id="country" name="country" required maxLength={80} defaultValue={values.country} autoComplete="country-name" className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="phone">{t.phone}</label>
            <input id="phone" name="phone" type="tel" maxLength={40} defaultValue={values.phone} dir="ltr" autoComplete="tel" className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="comments">{t.comments}</label>
            <textarea id="comments" name="comments" rows={3} maxLength={2000} defaultValue={values.comments} className="field" />
          </div>
        </div>
      </section>
      {children}
      <div>
        {err && <p role="alert" className="alert-error mb-4">{err}</p>}
        <SubmitButton className="btn-brand w-full py-4 text-base">{t.submit}</SubmitButton>
        <p className="mt-3 text-center text-xs text-muted">{t.submitHint}</p>
      </div>
    </form>
  );
}
