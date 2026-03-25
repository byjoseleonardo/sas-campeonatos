"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, LogOut, Trophy, ChevronRight } from "lucide-react";

const navItems = [
  { title: "Inscripción", url: "/delegado/inscripcion", icon: ClipboardList },
  { title: "Mi Equipo", url: "/delegado/equipo", icon: Users },
];

export default function DelegadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-lg px-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-display text-xl tracking-wide text-foreground">
            CHAMP<span className="text-primary">ZONE</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Portal Delegado</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Link>
      </header>

      {/* Nav tabs */}
      <nav className="border-b bg-card/50 px-6">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const active = pathname === item.url;
            return (
              <Link
                key={item.url}
                href={item.url}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
