"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, MapPin, Calendar, Users, Trophy, Swords } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  shieldUrl: string | null;
  _count: { rosterEntries: number };
}

interface Phase {
  id: string;
  name: string;
  type: string;
  order: number;
}

interface Match {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
  roundLabel: string | null;
  homeTeam: { id: string; name: string; shieldUrl: string | null };
  awayTeam: { id: string; name: string; shieldUrl: string | null };
  phase: { id: string; name: string } | null;
  jornada: { id: string; number: number; name: string | null } | null;
  group: { id: string; name: string } | null;
}

interface ChampionshipDetail {
  id: string;
  name: string;
  slug: string;
  sport: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  format: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  maxEquipos: number;
  minJugadores: number;
  matchDurationMin: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  inscripciones: "Inscripciones abiertas",
  en_curso:      "En curso",
  finalizado:    "Finalizado",
};

const statusBadge: Record<string, string> = {
  inscripciones: "bg-accent/15 text-accent-foreground border-accent/30",
  en_curso:      "bg-primary/15 text-primary border-primary/30",
  finalizado:    "bg-muted text-muted-foreground border-border",
};

const matchStatusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_curso:   "bg-primary/15 text-primary",
  finalizado: "bg-green-500/15 text-green-700",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

const matchStatusLabel: Record<string, string> = {
  programado: "Programado",
  en_curso:   "En curso",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  postergado: "Postergado",
};

const sportLabel: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── Componente de partido ────────────────────────────────────────────────────

function MatchRow({ match }: { match: Match }) {
  const dt = formatDateTime(match.scheduledAt);
  const isLive = match.status === "en_curso";
  const isDone = match.status === "finalizado";

  return (
    <Link href={`/partidos/${match.id}/live`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isLive ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <p className="text-sm font-semibold text-right leading-tight truncate">{match.homeTeam.name}</p>
            <div className="flex flex-col items-center gap-0.5 px-2">
              {isDone || isLive ? (
                <span className={`font-display text-xl tabular-nums font-bold ${isLive ? "text-primary" : ""}`}>
                  {match.homeScore} — {match.awayScore}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">vs</span>
              )}
              {isLive && <span className="text-[10px] text-primary animate-pulse font-medium">EN VIVO</span>}
            </div>
            <p className="text-sm font-semibold leading-tight truncate">{match.awayTeam.name}</p>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{dt ? `${dt.date} ${dt.time}` : "Sin fecha"}</span>
            <Badge className={`text-[10px] border-0 ${matchStatusBadge[match.status]}`}>
              {matchStatusLabel[match.status]}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ChampionshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData]       = useState<{ championship: ChampionshipDetail; teams: Team[]; phases: Phase[]; matches: Match[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/championships/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        const d = await r.json();
        setData(d);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-4xl">Campeonato no encontrado</h1>
        <Link href="/campeonatos" className="mt-4 inline-block text-primary hover:underline">
          ← Volver a campeonatos
        </Link>
      </div>
    );
  }

  const { championship, teams, phases, matches } = data;

  // Agrupar partidos por fase → jornada/grupo
  const grouped: Record<string, { label: string; matches: Match[] }> = {};

  for (const m of matches) {
    let key = "sin-fase";
    let label = "Partidos";

    if (m.phase) {
      key = m.phase.id;
      label = m.phase.name;
      if (m.jornada) {
        key = `${m.phase.id}-j${m.jornada.number}`;
        label = `${m.phase.name} — ${m.jornada.name ?? `Jornada ${m.jornada.number}`}`;
      } else if (m.group) {
        key = `${m.phase.id}-g${m.group.id}`;
        label = `${m.phase.name} — ${m.group.name}`;
      }
    } else if (m.jornada) {
      key = `j${m.jornada.number}`;
      label = m.jornada.name ?? `Jornada ${m.jornada.number}`;
    } else if (m.roundLabel) {
      key = m.roundLabel;
      label = m.roundLabel;
    }

    if (!grouped[key]) grouped[key] = { label, matches: [] };
    grouped[key].matches.push(m);
  }

  return (
    <div className="container py-8">
      <Link
        href="/campeonatos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a campeonatos
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-lg bg-secondary p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {championship.logoUrl ? (
              <img src={championship.logoUrl} alt={championship.name} className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary/50" />
              </div>
            )}
            <div>
              <Badge variant="outline" className={`text-xs ${statusBadge[championship.status]}`}>
                {statusLabel[championship.status]}
              </Badge>
              <h1 className="mt-2 font-display text-4xl md:text-5xl text-secondary-foreground">
                {championship.name}
              </h1>
              <p className="mt-1 text-sm text-secondary-foreground/70">
                {sportLabel[championship.sport] ?? championship.sport}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-secondary-foreground/70">
            {championship.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {championship.location}
              </span>
            )}
            {championship.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(championship.startDate)}
                {championship.endDate ? ` — ${formatDate(championship.endDate)}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {teams.length}{championship.maxEquipos > 0 ? ` / ${championship.maxEquipos}` : ""} equipos
            </span>
          </div>
        </div>

        {championship.description && (
          <p className="mt-4 text-sm text-secondary-foreground/70 max-w-2xl">
            {championship.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fixture" className="mt-8">
        <TabsList className="w-full justify-start bg-muted/60">
          <TabsTrigger value="fixture">Fixture</TabsTrigger>
          <TabsTrigger value="equipos">Equipos ({teams.length})</TabsTrigger>
        </TabsList>

        {/* Fixture */}
        <TabsContent value="fixture" className="mt-4">
          {matches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Swords className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">Sin partidos programados aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([key, { label, matches: groupMatches }]) => (
                <div key={key} className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                    {label}
                  </h2>
                  <div className="space-y-2">
                    {groupMatches.map((m) => <MatchRow key={m.id} match={m} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Equipos */}
        <TabsContent value="equipos" className="mt-4">
          {teams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">Sin equipos inscritos aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    {t.shieldUrl ? (
                      <img src={t.shieldUrl} alt={t.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{t.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t._count.rosterEntries} {t._count.rosterEntries === 1 ? "jugador" : "jugadores"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
