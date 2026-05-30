"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, UserCheck, Shield, Activity, Swords, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Championship {
  id: string;
  name: string;
  status: string;
  sport: string;
  _count: { teams: number };
}

interface RecentUser {
  id: string;
  firstName: string;
  paternalLastName: string;
  email: string;
  userRoles: { role: string }[];
}

interface DashboardData {
  championships: Championship[];
  stats: {
    total: number;
    tecnicos: number;
    delegados: number;
    supervisores: number;
    liveMatches: number;
  };
  recentUsers: RecentUser[];
}

const statusBadge: Record<string, string> = {
  inscripciones: "bg-accent/15 text-accent-foreground",
  en_curso:      "bg-primary/15 text-primary",
  finalizado:    "bg-muted text-muted-foreground",
  borrador:      "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  inscripciones: "Inscripciones",
  en_curso:      "En curso",
  finalizado:    "Finalizado",
  borrador:      "Borrador",
};

const sportLabel: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

const roleLabel: Record<string, string> = {
  tecnico_mesa: "Técnico Mesa",
  delegado:     "Delegado",
  supervisor:   "Supervisor",
  organizador:  "Organizador",
};

export default function AdminDashboardPage() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    {
      label: "Campeonatos",
      value: data?.stats.total ?? 0,
      icon: Trophy,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/campeonatos",
    },
    {
      label: "Técnicos de Mesa",
      value: data?.stats.tecnicos ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/tecnicos",
    },
    {
      label: "Delegados",
      value: data?.stats.delegados ?? 0,
      icon: UserCheck,
      color: "text-secondary-foreground",
      bg: "bg-secondary/50",
      href: "/admin/delegados",
    },
    {
      label: "Supervisores",
      value: data?.stats.supervisores ?? 0,
      icon: Shield,
      color: "text-accent-foreground",
      bg: "bg-accent/15",
      href: "/admin/roles",
    },
  ];

  const activeChamps = data?.championships.filter((c) => c.status === "en_curso") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground">DASHBOARD</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats */}
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

      {/* Partidos en vivo */}
      {(data?.stats.liveMatches ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-medium text-primary">
            {data?.stats.liveMatches} {data?.stats.liveMatches === 1 ? "partido en curso" : "partidos en curso"}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campeonatos activos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Campeonatos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.championships.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay campeonatos creados</p>
            ) : (
              data?.championships.slice(0, 5).map((c) => (
                <Link key={c.id} href={`/admin/campeonatos/${c.id}/fases`}>
                  <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sportLabel[c.sport] ?? c.sport} · {c._count.teams} equipos
                      </p>
                    </div>
                    <Badge className={`text-xs border-0 ${statusBadge[c.status]}`}>
                      {statusLabel[c.status]}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Usuarios recientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-4 w-4 text-primary" />
              Usuarios Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios asignados</p>
            ) : (
              data?.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm shrink-0">
                      {u.firstName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.firstName} {u.paternalLastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {roleLabel[u.userRoles[0]?.role] ?? u.userRoles[0]?.role ?? "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
