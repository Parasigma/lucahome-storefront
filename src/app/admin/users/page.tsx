import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/locales";
import { ActionForm } from "@/components/admin/ActionForm";
import { setRoleAction } from "@/app/actions/admin";

export const metadata = { title: "Usuarios" };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const q = (await searchParams).q?.trim().slice(0, 100);
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { orders: true } } },
  });
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Usuarios</h1>
        <form className="relative">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Nombre o correo" aria-label="Buscar" className="field w-64 py-2 ps-9" />
        </form>
      </div>
      <div className="card mt-5 overflow-x-auto shadow-none">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>{["Usuario", "Rol", "Expedientes", "Alta", ""].map((h) => <th key={h} className="px-5 py-3 text-start font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3.5"><span className="font-semibold">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></td>
                <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === "ADMIN" ? "bg-ink text-white" : "bg-paper text-ink-soft"}`}>{u.role === "ADMIN" ? "Administrador" : "Cliente"}</span></td>
                <td className="px-5 py-3.5 tabular-nums">{u._count.orders}</td>
                <td className="px-5 py-3.5 text-muted">{formatDateTime(u.createdAt, "es")}</td>
                <td className="px-5 py-3.5 text-end">
                  {u.id !== me.id && (
                    <ActionForm
                      action={setRoleAction}
                      submit={u.role === "ADMIN" ? "Quitar administrador" : "Hacer administrador"}
                      buttonClass="btn-ghost px-3 py-1.5 text-xs"
                      confirm={u.role === "ADMIN" ? `¿Quitar el acceso al panel a ${u.email}?` : `¿Dar acceso completo al panel a ${u.email}?`}
                      className="inline-flex flex-col items-end gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Se muestran los 100 usuarios más recientes. Usa el buscador para encontrar uno concreto.</p>
    </div>
  );
}
