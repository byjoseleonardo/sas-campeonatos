"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, UserCheck, Shield, Activity, Calendar } from "lucide-react";
import { championships } from "@/lib/mockData";
import { adminUsers } from "@/lib/adminMockData";
import Link from "next/link";

const stats = [
  {
    label: "Campeonatos",
    value: championships.length,
    icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/10",
    href: "/admin/campeonatos",
  },
  {
    label: "Organizadores",
    value: adminUsers.filter((u) => u.role === "organizador").length,
    icon: Shield,
    color: "text-accent-foreground",
    bg: "bg-accent/15",
    href: "/admin/roles",
  },
  {
    label: "Técnicos de Mesa",
    value: adminUsers.filter((u) => u.role === "tecnico_mesa").length,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    href: "/admin/tecnicos",
  },
  {
    label: "Delegados",
    value: adminUsers.filter((u) => u.role === "delegado").length,
    icon: UserCheck,
    color: "text-secondary-foreground",
    bg: "bg-secondary/50",
    href: "/admin/delegados",
  },
];

export default function AdminDashboardPage() {
  const activeChamps = championships.filter((c) => c.status === "activo");
  const recentUsers = adminUsers.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">DASHBOARD</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen general del sistema
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-elevated transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl p-3 ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-display">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Campeonatos Activos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeChamps.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.sport} · {c.teams} equipos
                  </p>
                </div>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  En curso
                </span>
              </div>
            ))}
            {activeChamps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay campeonatos activos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4 text-primary" />
              Usuarios Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs capitalize text-muted-foreground">
                  {u.role}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
