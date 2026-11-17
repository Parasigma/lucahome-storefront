"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Euro, FolderOpen, LayoutDashboard, PenLine, Users } from "lucide-react";

const items = [
  { href: "/admin", label: "Escritorio", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Expedientes", icon: FolderOpen },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/content", label: "Contenido", icon: PenLine },
  { href: "/admin/pricing", label: "Precios", icon: Euro },
  { href: "/admin/settings", label: "Empresa", icon: Building2 },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"}`}
          >
            <i.icon size={17} aria-hidden="true" /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
