"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";

const roleLabel: Record<string, string> = {
  administrador: "Panel de Administración",
  organizador:   "Portal Organizador",
  supervisor:    "Portal Supervisor",
  tecnico_mesa:  "Portal Técnico de Mesa",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Asegura que la sesión esté fresca al entrar al panel
  // (cubre el caso de cambio de usuario sin recarga de página)
  useEffect(() => { update(); }, []);
  const role = session?.user?.role ?? "";
  const headerTitle = roleLabel[role] ?? "Panel";

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-9 w-9 shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="truncate text-sm font-medium text-muted-foreground">{headerTitle}</span>
          </div>
          {session?.user?.name && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {session.user.name}
            </span>
          )}
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
