"use client";

import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Shield,
  Eye,
  ClipboardList,
  ChevronLeft,
  PanelLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Campeonatos", url: "/admin/campeonatos", icon: Trophy },
  { title: "Roles y Usuarios", url: "/admin/roles", icon: Shield },
  { title: "Delegados", url: "/admin/delegados", icon: UserCheck },
  { title: "Técnicos", url: "/admin/tecnicos", icon: Users },
  { title: "Supervisores", url: "/admin/supervisores", icon: Eye },
  { title: "Inscripción", url: "/admin/inscripcion", icon: ClipboardList },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(path);

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mx-auto"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link href="/admin" className="flex items-center gap-2">
              <Trophy className="h-6 w-6 shrink-0 text-primary" />
              <span className="font-display text-xl tracking-wide text-foreground">
                CHAMP<span className="text-primary">ZONE</span>
                <span className="ml-1.5 text-xs font-body font-medium text-muted-foreground">
                  Admin
                </span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-4 px-2">
        <p className={cn(
          "mb-2 px-2 text-xs font-medium text-muted-foreground",
          collapsed && "sr-only"
        )}>
          Gestión
        </p>
        <ul className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <Link
                href={item.url}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive(item.url) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
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

      {/* Footer */}
      <div className="border-t p-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-2",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Volver al sitio" : undefined}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Volver al sitio</span>}
        </Link>
      </div>
    </aside>
  );
}
