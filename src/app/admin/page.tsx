import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/locales";
import { remaining } from "@/lib/admin-ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [inReview, late, awaitingDocs, completed, users, revenue, queue, logs] = await Promise.all([
    db.order.count({ where: { status: "IN_REVIEW" } }),
    db.order.count({ where: { status: "IN_REVIEW", dueAt: { lt: now } } }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "COMPLETED" } }),
    db.user.count(),
    db.order.aggregate({ _sum: { totalCents: true }, where: { paidAt: { gte: monthStart }, status: { in: ["PAID", "IN_REVIEW", "COMPLETED"] } } }),
    db.order.findMany({ where: { status: "IN_REVIEW" }, orderBy: { dueAt: "asc" }, take: 10, include: { user: { select: { email: true } } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const stats = [
    { label: "En gestión", value: inReview, href: "/admin/orders?status=IN_REVIEW" },
    { label: "Fuera de plazo", value: late, href: "/admin/orders?status=IN_REVIEW", alert: late > 0 },
    { label: "Esperando documentos", value: awaitingDocs, href: "/admin/orders?status=PAID" },
    { label: "Presentados", value: completed, href: "/admin/orders?status=COMPLETED" },
    { label: "Ingresos del mes", value: formatMoney(revenue._sum.totalCents ?? 0, "es") },
    { label: "Usuarios", value: users, href: "/admin/users" },
  ];
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-extrabold">Escritorio</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-xs font-semibold text-muted">{s.label}</p>
              <p className={`mt-2 text-2xl font-extrabold tabular-nums ${s.alert ? "text-danger" : ""}`}>{s.value}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card p-5 shadow-none transition hover:border-ink/25">{body}</Link>
          ) : (
            <div key={s.label} className="card p-5 shadow-none">{body}</div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-6 shadow-none">
          <h2 className="font-bold">Cola de trabajo · por vencimiento</h2>
          {queue.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No hay expedientes pendientes de presentar.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {queue.map((o) => {
                const r = remaining(o.dueAt);
                return (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:text-brand-dark">
                      <span><span className="font-bold">{o.reference}</span> <span className="text-muted">· {o.fullName ?? o.user.email}</span></span>
                      <span className={`shrink-0 font-semibold ${r.late ? "text-danger" : r.urgent ? "text-warn" : "text-ink-soft"}`}>{r.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card p-6 shadow-none">
          <h2 className="font-bold">Actividad reciente</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {logs.length === 0 && <li className="text-muted">Sin actividad todavía.</li>}
            {logs.map((l) => (
              <li key={l.id}>
                <span className="font-semibold">{l.action}</span> <span className="text-ink-soft">{l.detail}</span>
                <span className="block text-xs text-muted">{l.actor} · {formatDateTime(l.createdAt, "es")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
