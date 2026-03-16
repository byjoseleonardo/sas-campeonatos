"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Inicio", path: "/" },
  { label: "Campeonatos", path: "/campeonatos" },
  { label: "Equipos", path: "/equipos" },
  { label: "Partidos", path: "/partidos" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Trophy className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl tracking-wide text-foreground">
            CHAMP<span className="text-primary">ZONE</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === item.path
                  ? "bg-muted text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button size="sm" className="ml-4">
            Iniciar Sesión
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-card px-4 pb-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                pathname === item.path
                  ? "bg-muted text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button size="sm" className="mt-2 w-full">
            Iniciar Sesión
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
