import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "../globals.css";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminLogoutAction } from "@/app/actions/admin";
import { Logo } from "@/components/Logo";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel Rapid Tax" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <html lang="es">
      <body className="min-h-screen lg:flex">
        <aside className="bg-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
          <div className="flex items-center justify-between px-6 py-5">
            <Logo light />
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">Panel</span>
          </div>
          <AdminNav />
          <div className="mt-auto hidden space-y-1 border-t border-white/10 p-3 lg:block">
            <p className="truncate px-3 py-1 text-xs text-white/50">{admin.email}</p>
            <a href="/es" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/65 hover:text-white"><ExternalLink size={16} /> Ver la web</a>
            <form action={adminLogoutAction}>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/65 hover:text-white"><LogOut size={16} /> Cerrar sesión</button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-10">{children}</main>
      </body>
    </html>
  );
}
