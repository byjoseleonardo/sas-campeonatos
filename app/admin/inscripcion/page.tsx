"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Championship {
  id: string;
  name: string;
  status: string;
  sport: string;
  _count: { teams: number };
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

export default function AdminInscripcionPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setChampionships(d.championships ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">PLANILLAS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selecciona un campeonato para revisar las planillas de jugadores
        </p>
      </div>

      {championships.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">Sin campeonatos creados</p>
            <p className="text-sm text-muted-foreground">
              Crea un campeonato primero para gestionar planillas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {championships.map((c) => (
            <Link key={c.id} href={`/admin/campeonatos/${c.id}/planillas`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-xl p-3 bg-primary/10 shrink-0">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sportLabel[c.sport] ?? c.sport} · {c._count.teams} equipos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs border-0 ${statusBadge[c.status]}`}>
                      {statusLabel[c.status]}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
