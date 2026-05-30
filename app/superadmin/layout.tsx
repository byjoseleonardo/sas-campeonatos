"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";
import { Button } from "@/components/ui/button";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { update } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { update(); }, []);

  return (
    <div className="flex min-h-svh w-full bg-background">
      <SuperAdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
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
            <span className="truncate text-sm font-medium text-muted-foreground">Panel Superadministrador</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
