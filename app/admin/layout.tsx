"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { AdminSidebar } from "@/components/AdminSidebar";

const roleLabel: Record<string, string> = {
  administrador: "Panel de Administración",
  organizador:   "Portal Organizador",
  supervisor:    "Portal Supervisor",
  tecnico_mesa:  "Portal Técnico de Mesa",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();

  // Asegura que la sesión esté fresca al entrar al panel
  // (cubre el caso de cambio de usuario sin recarga de página)
  useEffect(() => { update(); }, []);
  const role = session?.user?.role ?? "";
  const headerTitle = roleLabel[role] ?? "Panel";

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-lg px-6 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">{headerTitle}</span>
          {session?.user?.name && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {session.user.name}
            </span>
          )}
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
