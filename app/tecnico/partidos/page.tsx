"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, MapPin, ChevronRight, Swords } from "lucide-react";

interface Match {
  id: string;
  homeTeam:     { id: string; name: string };
  awayTeam:     { id: string; name: string };
  championship: { id: string; name: string };
  phase:        { id: string; name: string } | null;
  scheduledAt:  string | null;
  venue:        string | null;
  roundLabel:   string | null;
  status:       string;
  homeScore:    number;
  awayScore:    number;
}

const statusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_curso:   "bg-primary/15 text-primary",
  finalizado: "bg-green-500/15 text-green-700",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

const statusLabel: Record<string, string> = {
  programado: "Programado",
  en_curso:   "En curso",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  postergado: "Postergado",
};

const statusOrder: Record<string, number> = {
  en_curso: 0, programado: 1, postergado: 2, suspendido: 3, finalizado: 4,
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function TecnicoPartidosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tecnico/matches")
      .then((r) => r.json())
      .then((d) => setMatches(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...matches].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
  );

  // Agrupar por campeonato
  const byChamp: Record<string, Match[]> = {};
  for (const m of sorted) {
    const key = m.championship.name;
    if (!byChamp[key]) byChamp[key] = [];
    byChamp[key].push(m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">MIS PARTIDOS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Partidos de los campeonatos asignados a ti
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : matches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">Sin partidos asignados</p>
            <p className="text-sm text-muted-foreground">
              Aún no tienes campeonatos asignados o no hay partidos programados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(byChamp).map(([champName, champMatches]) => (
            <div key={champName} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                {champName}
              </h2>
              {champMatches.map((match) => {
                const dt = formatDateTime(match.scheduledAt);
                const isLive = match.status === "en_curso";
                const isDone = match.status === "finalizado";
                return (
                  <Link key={match.id} href={`/tecnico/partidos/${match.id}`}>
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isLive ? "ring-2 ring-primary/40" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Equipos y marcador */}
                          <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <p className="text-sm font-semibold text-right leading-tight">{match.homeTeam.name}</p>
                            <div className="flex flex-col items-center gap-0.5">
                              {isDone || isLive ? (
                                <span className={`font-display text-2xl tabular-nums ${isLive ? "text-primary" : ""}`}>
                                  {match.homeScore} — {match.awayScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm font-medium">vs</span>
                              )}
                              {isLive && (
                                <span className="text-[10px] font-medium text-primary animate-pulse">EN VIVO</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold leading-tight">{match.awayTeam.name}</p>
                          </div>

                          {/* Info */}
                          <div className="hidden sm:flex flex-col gap-1 items-end text-xs text-muted-foreground shrink-0">
                            {match.phase && <span>{match.phase.name}</span>}
                            {match.roundLabel && <span>{match.roundLabel}</span>}
                            {dt && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {dt.date} {dt.time}
                              </span>
                            )}
                            {match.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {match.venue}
                              </span>
                            )}
                          </div>

                          <Badge className={`shrink-0 text-xs border-0 ${statusBadge[match.status]}`}>
                            {statusLabel[match.status]}
                          </Badge>

                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
