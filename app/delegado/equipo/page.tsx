"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Trophy, MapPin, Clock, Loader2 } from "lucide-react";

const sportLabels: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

const statusLabels: Record<string, string> = {
  activo: "Activo", descalificado: "Descalificado", retirado: "Retirado",
};

interface Team {
  id: string;
  name: string;
  status: string;
  championship: {
    name: string;
    sport: string;
    location: string | null;
    startDate: string | null;
    titulares: number;
    suplentes: number;
    maxInscripciones: number;
  };
  _count: { rosterEntries: number };
}

export default function DelegadoEquipoPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/delegado/team")
      .then((r) => r.json())
      .then((d) => { setTeam(d ?? null); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl text-foreground">MI EQUIPO</h1>
          <p className="text-muted-foreground text-sm mt-1">Información general de tu equipo inscrito</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No tienes equipo registrado aún</p>
            <p className="text-sm text-muted-foreground">Ve a Inscripción para registrar tu equipo en un campeonato.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxPlayers = team.championship.maxInscripciones;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">MI EQUIPO</h1>
        <p className="text-muted-foreground text-sm mt-1">Información general de tu equipo inscrito</p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-secondary to-secondary/80 flex items-end p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-primary-foreground">{team.name}</h2>
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-0">
                {statusLabels[team.status] ?? team.status}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campeonato</p>
                <p className="text-sm font-medium">{team.championship.name}</p>
                <p className="text-xs text-muted-foreground">{sportLabels[team.championship.sport] ?? team.championship.sport}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-accent/10">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jugadores</p>
                <p className="text-sm font-medium">{team._count.rosterEntries} / {maxPlayers}</p>
                <p className="text-xs text-muted-foreground">{team.championship.titulares} titulares · {team.championship.suplentes} suplentes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sede</p>
                <p className="text-sm font-medium">{team.championship.location ?? "—"}</p>
              </div>
            </div>
            {team.championship.startDate && (
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-sm font-medium">
                    {new Date(team.championship.startDate).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
