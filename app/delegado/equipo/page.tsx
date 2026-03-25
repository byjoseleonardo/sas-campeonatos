"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Trophy, MapPin } from "lucide-react";

export default function DelegadoEquipoPage() {
  const team = {
    name: "FC Esmeraldas",
    category: "Fútbol - Sub 20",
    championship: "Copa Ciudad 2025",
    location: "Esmeraldas",
    playersCount: 14,
    maxPlayers: 22,
    status: "activo" as const,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">MI EQUIPO</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Información general de tu equipo inscrito
        </p>
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
                {team.category}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campeonato</p>
                <p className="text-sm font-medium">{team.championship}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-accent/10">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jugadores</p>
                <p className="text-sm font-medium">{team.playersCount} / {team.maxPlayers}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="text-sm font-medium">{team.location}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
