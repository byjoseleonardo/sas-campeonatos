"use client";

import { use } from "react";
import Link from "next/link";
import { championships, matches, standings, brackets, teams } from "@/lib/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import FixtureByJornada from "@/components/FixtureByJornada";
import StandingsTable from "@/components/StandingsTable";
import EliminationBracket from "@/components/EliminationBracket";

const statusStyles: Record<string, string> = {
  activo: "bg-primary/15 text-primary border-primary/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  inscripciones: "bg-accent/15 text-accent-foreground border-accent/30",
};

export default function ChampionshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const championship = championships.find((c) => c.id === id);

  if (!championship) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-4xl text-foreground">Campeonato no encontrado</h1>
        <Link href="/campeonatos" className="mt-4 inline-block text-primary hover:underline">
          ← Volver a campeonatos
        </Link>
      </div>
    );
  }

  const champMatches = matches.filter((m) => m.championshipId === id);
  const champStandings = standings[id];
  const champBrackets = brackets[id];
  const champTeams = teams.filter((t) => t.championshipId === id);
  const isLeague = championship.format.includes("Liga") || championship.format.includes("grupos");
  const isElimination = championship.format.includes("Eliminación") || championship.format.includes("eliminación");

  return (
    <div className="container py-8">
      {/* Back link */}
      <Link href="/campeonatos" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a campeonatos
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-lg bg-secondary p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className={statusStyles[championship.status]}>
              {championship.status === "activo" ? "En curso" : championship.status === "finalizado" ? "Finalizado" : "Inscripciones abiertas"}
            </Badge>
            <h1 className="mt-3 font-display text-4xl md:text-5xl text-secondary-foreground">{championship.name}</h1>
            <p className="mt-1 text-sm text-secondary-foreground/70">{championship.format}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-secondary-foreground/70">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{championship.date}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{champTeams.length} equipos</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{championship.location}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fixture" className="mt-8">
        <TabsList className="w-full justify-start bg-muted/60">
          <TabsTrigger value="fixture">Fixture</TabsTrigger>
          {isLeague && <TabsTrigger value="standings">Tabla de Posiciones</TabsTrigger>}
          {isElimination && <TabsTrigger value="bracket">Llaves</TabsTrigger>}
          <TabsTrigger value="teams">Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="fixture">
          <FixtureByJornada matches={champMatches} />
        </TabsContent>

        {isLeague && (
          <TabsContent value="standings">
            {champStandings ? (
              <StandingsTable rows={champStandings} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">Tabla de posiciones no disponible aún.</p>
            )}
          </TabsContent>
        )}

        {isElimination && (
          <TabsContent value="bracket">
            {champBrackets ? (
              <EliminationBracket matches={champBrackets} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">Las llaves aún no se han definido.</p>
            )}
          </TabsContent>
        )}

        <TabsContent value="teams">
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {champTeams.map((t) => (
              <div key={t.id} className="rounded-lg border bg-card p-4 shadow-card">
                <h3 className="font-display text-xl text-card-foreground">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.players} jugadores · {t.sport}</p>
              </div>
            ))}
            {champTeams.length === 0 && (
              <p className="col-span-full py-12 text-center text-muted-foreground">No hay equipos inscritos aún.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
