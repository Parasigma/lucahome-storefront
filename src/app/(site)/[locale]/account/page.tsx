import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { formatDateTime, formatMoney, isLocale } from "@/lib/locales";
import { getDictionary } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { robots: { index: false } };

export default async function Account({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account`);
  const t = (await getDictionary(locale)).account;
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="container-x max-w-4xl py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted" dir="ltr">{user.email}</p>
        </div>
        <Link href={`/${locale}/checkout`} className="btn-primary"><Plus size={16} aria-hidden="true" /> {t.newOrder}</Link>
      </div>
      {orders.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-ink-soft">{t.empty}</div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/${locale}/account/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-ink/25">
                <div>
                  <p className="font-bold" dir="ltr">{o.reference}</p>
                  <p className="mt-0.5 text-xs text-muted">{t.created}: {formatDateTime(o.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(o.totalCents, locale)}</span>
                  <StatusBadge status={o.status} label={t[`status${o.status}`]} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
