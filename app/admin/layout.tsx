"use client";

import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 flex items-center gap-4 border-b bg-card/80 backdrop-blur-lg px-6 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">
            Panel de Administración
          </span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
