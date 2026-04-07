"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { update } = useSession();

  useEffect(() => { update(); }, []);

  return (
    <div className="flex min-h-svh w-full bg-background">
      <SuperAdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-lg px-6 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">Panel Superadministrador</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
