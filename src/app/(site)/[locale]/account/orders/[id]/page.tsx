import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Download, FileText, Trash2 } from "lucide-react";
import { fill, formatDateTime, formatMoney, isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/payments";
import { markOrderPaid } from "@/lib/orders";
import { deleteDocumentAction } from "@/app/actions/orders";
import { StatusBadge } from "@/components/StatusBadge";
import { Uploader } from "@/components/Uploader";
import { SubmitOrderForm } from "@/components/SubmitOrderForm";
import { CheckoutButton } from "@/components/CheckoutButton";
import { PriceBreakdown } from "@/components/PriceBreakdown";

export const metadata = { robots: { index: false } };

const load = (id: string, userId: string) =>
  db.order.findFirst({ where: { id, userId }, include: { documents: { orderBy: { createdAt: "asc" } } } });

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/orders/${id}`);
  let order = await load(id, user.id);
  if (!order) notFound();

  // Al volver de Stripe se verifica el pago directamente, por si el webhook aún no ha llegado.
  const { session_id } = await searchParams;
  if (order.status === "PENDING_PAYMENT" && session_id && session_id === order.stripeSessionId) {
    const session = await getStripe()?.checkout.sessions.retrieve(session_id).catch(() => null);
    if (session?.payment_status === "paid" && session.amount_total === order.totalCents) {
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      await markOrderPaid(order.id, pi);
      order = (await load(id, user.id))!;
    }
  }

  const dict = await getDictionary(locale);
  const t = dict.account;
  const customerDocs = order.documents.filter((d) => d.kind === "CUSTOMER");
  const receipts = order.documents.filter((d) => d.kind === "RECEIPT");
  const needed = [dict.home.docs1, dict.home.docs2, dict.home.docs3, dict.home.docs4, dict.home.docs5];
  const editable = order.status === "PAID";

  const docList = customerDocs.length > 0 && (
    <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
      {customerDocs.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <a href={`/api/files/${d.id}`} className="flex min-w-0 items-center gap-2.5 font-semibold hover:text-brand-dark">
            <FileText size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="truncate">{d.filename}</span>
          </a>
          {editable && (
            <button form={`del-${d.id}`} className="shrink-0 text-muted hover:text-danger" aria-label={t.remove} title={t.remove}>
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="container-x max-w-3xl py-12">
      <Link href={`/${locale}/account`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" /> {t.back}
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.order} <span dir="ltr">{order.reference}</span></h1>
        <StatusBadge status={order.status} label={t[`status${order.status}`]} />
      </div>
      <p className="mt-1 text-sm text-muted">{t.created}: {formatDateTime(order.createdAt, locale)} · {t.total}: {formatMoney(order.totalCents, locale)}</p>

      <div className="mt-8 space-y-8">
        {order.status === "PENDING_PAYMENT" && (
          <section className="card p-7">
            <p className="text-ink-soft">{session_id ? t.pendingText : dict.checkout.cancelled}</p>
            <div className="mt-4"><PriceBreakdown t={dict.home} locale={locale} a={order} hints={false} /></div>
            <div className="mt-6">
              <CheckoutButton locale={locale} orderId={order.id} label={t.payNow} errorText={dict.checkout.unavailable} />
            </div>
          </section>
        )}

        {editable && (
          <>
            <p className="alert-ok flex items-center gap-2"><CheckCircle2 size={18} aria-hidden="true" /> {t.paidOk}</p>
            {customerDocs.map((d) => (
              <form key={d.id} id={`del-${d.id}`} action={deleteDocumentAction}>
                <input type="hidden" name="docId" value={d.id} />
              </form>
            ))}
            <SubmitOrderForm
              orderId={order.id}
              t={t}
              values={{ fullName: order.fullName ?? user.name, taxId: order.taxId ?? "", country: order.country ?? "", phone: order.phone ?? "", comments: order.comments ?? "" }}
            >
              <section className="card p-7">
                <h2 className="text-lg font-bold"><span className="text-brand">2.</span> {t.step2}</h2>
                <div className="mt-4 rounded-xl bg-paper p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{t.needed}</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-soft">
                    {needed.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                </div>
                <div className="mt-5">
                  <Uploader orderId={order.id} labels={{ button: t.uploadButton, hint: t.uploadHint, uploading: t.uploading, errFile: t.errFile, errLimit: t.errLimit, errGeneric: t.errGeneric }} />
                </div>
                {docList}
              </section>
            </SubmitOrderForm>
          </>
        )}

        {order.status === "IN_REVIEW" && (
          <section className="card p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800"><Clock aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-bold">{t.inReviewTitle}</h2>
                <p className="mt-1 text-ink-soft">{fill(t.inReviewText, { date: order.dueAt ? formatDateTime(order.dueAt, locale) : "" })}</p>
              </div>
            </div>
          </section>
        )}

        {order.status === "COMPLETED" && (
          <section className="card border-brand/30 p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark"><CheckCircle2 aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-bold">{t.completedTitle}</h2>
                <p className="mt-1 text-ink-soft">{t.completedText}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {receipts.map((d) => (
                <li key={d.id}>
                  <a href={`/api/files/${d.id}`} className="btn-brand"><Download size={16} aria-hidden="true" /> {t.download} · {t.receipt}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.status === "REFUNDED" && <p className="alert-ok">{t.refundedText}</p>}

        {!editable && customerDocs.length > 0 && (
          <section className="card p-7">
            <h2 className="text-lg font-bold">{t.yourDocs}</h2>
            {docList}
          </section>
        )}
      </div>
    </div>
  );
}
