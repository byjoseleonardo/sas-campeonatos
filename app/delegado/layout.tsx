"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, LogOut, Trophy, ChevronRight } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { title: "Inscripción", url: "/delegado/inscripcion", icon: ClipboardList },
  { title: "Mi Equipo", url: "/delegado/equipo", icon: Users },
];

export default function DelegadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-lg px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-display text-xl tracking-wide text-foreground">
            CHAMP<span className="text-primary">ZONE</span>
          </span>
          <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          <span className="hidden truncate text-sm font-medium text-muted-foreground sm:block">Portal Delegado</span>
        </div>
        <button
          onClick={() => signOut({ redirectTo: "/" })}
          className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      {/* Nav tabs */}
      <nav className="border-b bg-card/50 px-4 sm:px-6">
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

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
