"use client";

import {
  LayoutDashboard, Trophy, Users, UserCheck,
  Shield, Eye, ClipboardList, ChevronLeft, PanelLeft, LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Role = "administrador" | "organizador" | "supervisor" | "tecnico" | "delegado";

const menuItems = [
  { title: "Dashboard",       url: "/admin",               icon: LayoutDashboard, roles: ["administrador", "organizador"] },
  { title: "Campeonatos",     url: "/admin/campeonatos",   icon: Trophy,          roles: ["administrador", "organizador"] },
  { title: "Delegados",       url: "/admin/delegados",     icon: UserCheck,       roles: ["administrador", "organizador"] },
  { title: "Roles y Usuarios",url: "/admin/roles",         icon: Shield,          roles: ["administrador"] },
  { title: "Técnicos",        url: "/admin/tecnicos",      icon: Users,           roles: ["administrador"] },
  { title: "Supervisores",    url: "/admin/supervisores",  icon: Eye,             roles: ["administrador"] },
  { title: "Inscripción",     url: "/admin/inscripcion",   icon: ClipboardList,   roles: ["administrador"] },
];

const roleLabel: Record<string, string> = {
  administrador: "Admin",
  organizador:   "Organizador",
  supervisor:    "Supervisor",
  tecnico:       "Técnico",
};

export function AdminSidebar() {
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
    <aside
      className={cn(
        "sticky top-0 h-svh flex flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear shrink-0",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3">
        {collapsed ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto" onClick={() => setCollapsed(false)}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link href="/admin" className="flex items-center gap-2">
              <Trophy className="h-6 w-6 shrink-0 text-primary" />
              <span className="font-display text-xl tracking-wide text-foreground">
                CHAMP<span className="text-primary">ZONE</span>
                <span className="ml-1.5 text-xs font-body font-medium text-muted-foreground">
                  {roleLabel[role] ?? "Admin"}
                </span>
              </span>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(true)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-4 px-2">
        <p className={cn("mb-2 px-2 text-xs font-medium text-muted-foreground", collapsed && "sr-only")}>
          Gestión
        </p>
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <li key={item.title}>
              <Link
                href={item.url}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive(item.url) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer: user info + logout */}
      <div className="border-t p-3 space-y-1">
        {!collapsed && session?.user && (
          <div className="px-2 py-1">
            <p className="text-xs font-medium text-foreground truncate">{session.user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
          </div>
        )}
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.refresh();
            router.push("/login");
          }}
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-2 w-full",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
