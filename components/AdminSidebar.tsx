"use client";

import {
  LayoutDashboard, Trophy, Users, UserCheck,
  Shield, Eye, ClipboardList, PanelLeft, LogOut, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Role = "superadministrador" | "administrador" | "organizador" | "supervisor" | "tecnico_mesa" | "delegado";

const menuItems = [
  { title: "Dashboard",        url: "/admin",               icon: LayoutDashboard, roles: ["administrador", "organizador"] },
  { title: "Campeonatos",      url: "/admin/campeonatos",   icon: Trophy,          roles: ["administrador", "organizador"] },
  { title: "Organizadores",    url: "/admin/roles",         icon: Shield,          roles: ["administrador"] },
  { title: "Delegados",        url: "/admin/delegados",     icon: UserCheck,       roles: ["organizador"] },
  { title: "Técnicos de Mesa", url: "/admin/tecnicos",      icon: Users,           roles: ["organizador"] },
  { title: "Supervisores",     url: "/admin/supervisores",  icon: Eye,             roles: ["organizador"] },
  { title: "Inscripción",      url: "/admin/inscripcion",   icon: ClipboardList,   roles: ["organizador"] },
];

const roleLabel: Record<string, string> = {
  administrador: "Admin",
  organizador:   "Organizador",
  supervisor:    "Supervisor",
  tecnico_mesa:  "Técnico de Mesa",
};

export function AdminSidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "") as Role;

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(role)
  );

  const isActive = (path: string) =>
    path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);

  return (
    <>
      {/* Backdrop (solo móvil, cuando el drawer está abierto) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar text-sidebar-foreground",
          // Móvil: drawer deslizable fuera de pantalla
          "fixed inset-y-0 left-0 z-50 h-svh w-64 transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Escritorio: estático y colapsable
          "md:sticky md:top-0 md:z-auto md:translate-x-0 md:shrink-0 md:transition-[width]",
          collapsed ? "md:w-14" : "md:w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b px-3">
          {collapsed ? (
            <Button variant="ghost" size="icon" className="mx-auto hidden h-8 w-8 md:flex" onClick={() => setCollapsed(false)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <Link href="/admin" className="flex items-center gap-2" onClick={onMobileClose}>
                <Trophy className="h-6 w-6 shrink-0 text-primary" />
                <span className="font-display text-xl tracking-wide text-foreground">
                  CHAMP<span className="text-primary">ZONE</span>
                  <span className="ml-1.5 font-body text-xs font-medium text-muted-foreground">
                    {roleLabel[role] ?? "Admin"}
                  </span>
                </span>
              </Link>
              {/* Colapsar (escritorio) */}
              <Button variant="ghost" size="icon" className="hidden h-8 w-8 md:inline-flex" onClick={() => setCollapsed(true)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
              {/* Cerrar drawer (móvil) */}
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMobileClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto px-2 py-4">
          <p className={cn("mb-2 px-2 text-xs font-medium text-muted-foreground", collapsed && "md:sr-only")}>
            Gestión
          </p>
          <ul className="flex flex-col gap-1">
            {visibleItems.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.url}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive(item.url) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    collapsed && "md:justify-center md:px-0"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn(collapsed && "md:hidden")}>{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer: user info + logout */}
        <div className="space-y-1 border-t p-3">
          {session?.user && (
            <div className={cn("px-2 py-1", collapsed && "md:hidden")}>
              <p className="truncate text-xs font-medium text-foreground">{session.user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{session.user.email}</p>
            </div>
          )}
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              router.refresh();
              router.push("/login");
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
              collapsed && "md:justify-center md:px-0"
            )}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
