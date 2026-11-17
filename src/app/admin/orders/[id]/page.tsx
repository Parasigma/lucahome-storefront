import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney, localeNames, isLocale } from "@/lib/locales";
import { remaining, statusLabels } from "@/lib/admin-ui";
import { StatusBadge } from "@/components/StatusBadge";
import { Uploader } from "@/components/Uploader";
import { ActionForm } from "@/components/admin/ActionForm";
import { cancelOrderAction, completeOrderAction, refundOrderAction, saveNotesAction } from "@/app/actions/admin";

export const metadata = { title: "Expediente" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { user: true, documents: { orderBy: { createdAt: "asc" } } } });
  if (!o) notFound();
  const docs = o.documents.filter((d) => d.kind === "CUSTOMER");
  const receipts = o.documents.filter((d) => d.kind === "RECEIPT");
  const r = remaining(o.dueAt);
  const hidden = <input type="hidden" name="orderId" value={o.id} />;
  const data: [string, string | null | undefined][] = [
    ["Titular", o.fullName], ["NIE / pasaporte", o.taxId], ["País de residencia", o.country], ["Teléfono", o.phone],
    ["Correo de la cuenta", o.user.email], ["Idioma del cliente", isLocale(o.locale) ? localeNames[o.locale] : o.locale],
  ];
  const dates: [string, Date | null][] = [
    ["Creado", o.createdAt], ["Pagado", o.paidAt], ["Documentación enviada", o.submittedAt], ["Vence", o.dueAt], ["Presentado", o.completedAt], ["Reembolsado", o.refundedAt],
  ];
  const money: [string, number][] = [
    ["Honorarios", o.feeCents], ["Servicio", o.serviceCents], ["Tasas", o.taxesCents], ["IVA", o.vatCents],
  ];
  const fileRow = (d: (typeof o.documents)[number]) => (
    <li key={d.id}>
      <a href={`/api/files/${d.id}`} className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold hover:text-brand-dark">
        <FileText size={16} className="shrink-0 text-muted" /> <span className="truncate">{d.filename}</span>
        <span className="ms-auto shrink-0 text-xs font-normal text-muted">{(d.size / 1024).toFixed(0)} KB</span>
      </a>
    </li>
  );
  return (
    <div className="max-w-6xl">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} /> Expedientes</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{o.reference}</h1>
        <StatusBadge status={o.status} label={statusLabels[o.status]} />
        {o.demo && <span className="rounded bg-warn/10 px-2 py-1 text-xs font-bold text-warn">Pago de demostración</span>}
        {o.status === "IN_REVIEW" && <span className={`text-sm font-bold ${r.late ? "text-danger" : r.urgent ? "text-warn" : "text-ink-soft"}`}>{r.text}</span>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6 shadow-none">
            <h2 className="font-bold">Datos del contribuyente</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {data.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{v || "—"}</dd></div>)}
            </dl>
            {o.comments && <div className="mt-4 rounded-xl bg-paper p-4 text-sm"><p className="text-xs font-bold text-muted">Comentarios del cliente</p><p className="mt-1 whitespace-pre-wrap">{o.comments}</p></div>}
          </section>

          <section className="card p-6 shadow-none">
            <h2 className="font-bold">Documentos del cliente ({docs.length})</h2>
            {docs.length === 0 ? <p className="mt-3 text-sm text-muted">El cliente aún no ha subido documentos.</p> : <ul className="mt-4 divide-y divide-line rounded-xl border border-line">{docs.map(fileRow)}</ul>}
          </section>

          {(o.status === "IN_REVIEW" || o.status === "COMPLETED") && (
            <section className="card border-brand/30 p-6 shadow-none">
              <h2 className="font-bold">Justificante de presentación</h2>
              {receipts.length > 0 && <ul className="mt-4 divide-y divide-line rounded-xl border border-line">{receipts.map(fileRow)}</ul>}
              {o.status === "IN_REVIEW" && (
                <div className="mt-4 space-y-4">
                  <Uploader orderId={o.id} kind="RECEIPT" accept=".pdf" multiple={false} labels={{ button: "Subir justificante (PDF)", hint: "Máx. 10 MB", uploading: "Subiendo…", errFile: "Archivo no válido: debe ser un PDF de hasta 10 MB.", errLimit: "Límite de archivos alcanzado.", errGeneric: "No se ha podido subir el archivo." }} />
                  <ActionForm action={completeOrderAction} submit="Marcar como presentado y enviar justificante" buttonClass="btn-brand w-full" confirm="Se enviará el justificante por correo al cliente. ¿Continuar?">{hidden}</ActionForm>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-6 shadow-none">
            <h2 className="font-bold">Importe</h2>
            <dl className="mt-3 text-sm">
              {money.map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-2"><dt className="text-ink-soft">{k}</dt><dd className="tabular-nums">{formatMoney(v, "es")}</dd></div>)}
              <div className="flex justify-between pt-3 font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.totalCents, "es")}</dd></div>
            </dl>
            {o.stripePaymentIntentId && <p className="mt-3 break-all text-xs text-muted">Stripe: {o.stripePaymentIntentId}</p>}
          </section>

          <section className="card p-6 shadow-none">
            <h2 className="font-bold">Cronología</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {dates.filter(([, d]) => d).map(([k, d]) => <div key={k} className="flex justify-between gap-4"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold">{formatDateTime(d!, "es")}</dd></div>)}
            </dl>
          </section>

          <section className="card p-6 shadow-none">
            <h2 className="font-bold">Notas internas</h2>
            <form action={saveNotesAction} className="mt-3 space-y-3">
              {hidden}
              <textarea name="adminNotes" rows={4} defaultValue={o.adminNotes ?? ""} className="field" placeholder="Solo visibles para el equipo" />
              <button className="btn-ghost py-2">Guardar notas</button>
            </form>
          </section>

          {["PAID", "IN_REVIEW", "COMPLETED"].includes(o.status) && (
            <section className="card p-6 shadow-none">
              <h2 className="font-bold">Garantía de devolución</h2>
              <p className="mt-2 text-sm text-ink-soft">Devuelve el importe íntegro al método de pago del cliente y le avisa por correo.</p>
              <ActionForm action={refundOrderAction} submit={`Reembolsar ${formatMoney(o.totalCents, "es")}`} buttonClass="btn-danger w-full" confirm="Se devolverá el importe íntegro al cliente. Esta acción no se puede deshacer. ¿Continuar?" className="mt-4 space-y-3">{hidden}</ActionForm>
            </section>
          )}
          {o.status === "PENDING_PAYMENT" && (
            <ActionForm action={cancelOrderAction} submit="Cancelar expediente sin pagar" buttonClass="btn-danger w-full" confirm="¿Cancelar este expediente?">{hidden}</ActionForm>
          )}
        </div>
      </div>
    </div>
  );
}
