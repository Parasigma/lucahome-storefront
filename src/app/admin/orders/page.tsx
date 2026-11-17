import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/locales";
import { remaining, statusLabels } from "@/lib/admin-ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata = { title: "Expedientes" };
const PAGE = 25;

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in statusLabels ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { reference: { contains: q, mode: "insensitive" as const } },
        { fullName: { contains: q, mode: "insensitive" as const } },
        { taxId: { contains: q, mode: "insensitive" as const } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { email: true } } } }),
    db.order.count({ where }),
  ]);
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...p })) if (v) u.set(k, v);
    return `/admin/orders?${u}`;
  };
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-extrabold">Expedientes</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={link({ status: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${!status ? "bg-ink text-white" : "bg-white text-ink-soft border border-line"}`}>Todos</Link>
        {Object.entries(statusLabels).map(([k, v]) => (
          <Link key={k} href={link({ status: k, page: undefined })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === k ? "bg-ink text-white" : "bg-white text-ink-soft border border-line"}`}>{v}</Link>
        ))}
        <form className="relative ms-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Referencia, nombre, NIE o correo" aria-label="Buscar" className="field w-72 py-2 ps-9" />
        </form>
      </div>
      <div className="card mt-5 overflow-x-auto shadow-none">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>{["Referencia", "Cliente", "Estado", "Plazo", "Total", "Creado"].map((h) => <th key={h} className="px-5 py-3 text-start font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => {
              const r = o.status === "IN_REVIEW" ? remaining(o.dueAt) : null;
              return (
                <tr key={o.id} className="hover:bg-paper">
                  <td className="px-5 py-3.5"><Link href={`/admin/orders/${o.id}`} className="font-bold hover:text-brand-dark">{o.reference}</Link>{o.demo && <span className="ms-2 text-[10px] font-bold text-warn">DEMO</span>}</td>
                  <td className="px-5 py-3.5"><span className="font-semibold">{o.fullName ?? "—"}</span><span className="block text-xs text-muted">{o.user.email}</span></td>
                  <td className="px-5 py-3.5"><StatusBadge status={o.status} label={statusLabels[o.status]} /></td>
                  <td className={`px-5 py-3.5 font-semibold ${r?.late ? "text-danger" : r?.urgent ? "text-warn" : "text-ink-soft"}`}>{r?.text ?? "—"}</td>
                  <td className="px-5 py-3.5 tabular-nums">{formatMoney(o.totalCents, "es")}</td>
                  <td className="px-5 py-3.5 text-muted">{formatDateTime(o.createdAt, "es")}</td>
                </tr>
              );
            })}
            {orders.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">No hay expedientes con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{total} expedientes</span>
        <span className="flex gap-2">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-ghost py-2">Anterior</Link>}
          {page * PAGE < total && <Link href={link({ page: String(page + 1) })} className="btn-ghost py-2">Siguiente</Link>}
        </span>
      </div>
    </div>
  );
}
