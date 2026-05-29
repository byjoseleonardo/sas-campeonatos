"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, Swords } from "lucide-react";
import { useLiveMatches } from "@/hooks/use-live-matches";

interface Match {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
  roundLabel: string | null;
  homeTeam: { id: string; name: string } | null;
  awayTeam: { id: string; name: string } | null;
  championship: { id: string; name: string };
  phase: { id: string; name: string } | null;
}

const statusFilters = ["todos", "en_curso", "programado", "finalizado"] as const;

const filterLabel: Record<string, string> = {
  todos:     "Todos",
  en_curso:  "En Vivo",
  programado: "Programados",
  finalizado: "Finalizados",
};

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

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("todos");

  useEffect(() => {
    fetch("/api/public/matches")
      .then((r) => r.json())
      .then((d) => setMatches(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  // Marcadores en vivo por WebSocket (scores-backend): se suscribe a cada campeonato presente
  const { patches, connected } = useLiveMatches(matches.map((m) => m.championship.id));
  const liveMatches: Match[] = matches.map((m) => (patches[m.id] ? { ...m, ...patches[m.id] } : m));

  const filtered = filter === "todos"
    ? liveMatches
    : liveMatches.filter((m) => m.status === filter);

  // Agrupar por campeonato
  const byChamp: Record<string, { champName: string; matches: Match[] }> = {};
  for (const m of filtered) {
    const key = m.championship.id;
    if (!byChamp[key]) byChamp[key] = { champName: m.championship.name, matches: [] };
    byChamp[key].matches.push(m);
  }

  return (
    <div className="container py-12">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-5xl text-foreground">PARTIDOS</h1>
        {connected && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> En vivo
          </span>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">Calendario y resultados de los encuentros</p>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filterLabel[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Swords className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay partidos en esta categoría.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(byChamp).map(([champId, { champName, matches: champMatches }]) => (
            <div key={champId}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2 mb-3">
                {champName}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {champMatches.map((m) => {
                  const dt = formatDateTime(m.scheduledAt);
                  const isLive = m.status === "en_curso";
                  const isDone = m.status === "finalizado";
                  return (
                    <Link key={m.id} href={`/partidos/${m.id}/live`}>
                      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isLive ? "ring-2 ring-primary/30" : ""}`}>
                        <CardContent className="p-4">
                          {/* Info superior */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <span>{m.phase?.name ?? m.roundLabel ?? ""}</span>
                            <div className="flex items-center gap-1.5">
                              {isLive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              )}
                              <Badge className={`text-[10px] border-0 ${statusBadge[m.status]}`}>
                                {isLive ? "EN VIVO" : statusLabel[m.status]}
                              </Badge>
                            </div>
                          </div>

                          {/* Equipos y marcador */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <p className={`text-sm font-semibold text-right leading-tight truncate ${isDone && m.homeScore > m.awayScore ? "text-primary" : ""}`}>
                              {m.homeTeam?.name ?? "Por definir"}
                            </p>
                            <div className="flex flex-col items-center px-2">
                              {isDone || isLive ? (
                                <span className={`font-display text-2xl font-bold tabular-nums ${isLive ? "text-primary" : ""}`}>
                                  {m.homeScore} — {m.awayScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm font-medium">vs</span>
                              )}
                            </div>
                            <p className={`text-sm font-semibold leading-tight truncate ${isDone && m.awayScore > m.homeScore ? "text-primary" : ""}`}>
                              {m.awayTeam?.name ?? "Por definir"}
                            </p>
                          </div>

                          {/* Fecha/hora */}
                          {dt && (
                            <p className="mt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" />
                              {dt.date} · {dt.time}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
