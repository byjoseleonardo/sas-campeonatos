"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Trophy, Activity } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalAdmins: number;
  activeAdmins: number;
  totalOrganizadores: number;
  totalCampeonatos: number;
}

interface RecentAdmin {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAdmins, setRecentAdmins] = useState<RecentAdmin[]>([]);

  useEffect(() => {
    fetch("/api/superadmin/admins")
      .then((r) => r.json())
      .then((data) => {
        const admins: RecentAdmin[] = Array.isArray(data) ? data : [];
        setStats({
          totalAdmins: admins.length,
          activeAdmins: admins.filter((a) => a.isActive).length,
          totalOrganizadores: 0,
          totalCampeonatos: 0,
        });
        setRecentAdmins(admins.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const statCards = [
    {
      label: "Administradores",
      value: stats?.totalAdmins ?? "—",
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/superadmin/admins",
    },
    {
      label: "Admins Activos",
      value: stats?.activeAdmins ?? "—",
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-500/10",
      href: "/superadmin/admins",
    },
    {
      label: "Organizadores",
      value: stats?.totalOrganizadores ?? "—",
      icon: Users,
      color: "text-accent-foreground",
      bg: "bg-accent/15",
      href: "/superadmin/admins",
    },
    {
      label: "Campeonatos",
      value: stats?.totalCampeonatos ?? "—",
      icon: Trophy,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/superadmin/admins",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">DASHBOARD</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de la plataforma SAS Campeonatos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-4 w-4 text-primary" />
            Administradores Recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAdmins.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay administradores registrados
            </p>
          )}
          {recentAdmins.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm">
                  {a.firstName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{[a.firstName, a.paternalLastName, a.maternalLastName].filter(Boolean).join(" ")}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                a.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {a.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
