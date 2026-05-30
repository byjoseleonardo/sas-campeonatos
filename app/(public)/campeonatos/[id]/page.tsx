"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, MapPin, Calendar, Users, Trophy, Swords, ShieldCheck, ChevronRight } from "lucide-react";
import { useLiveMatches } from "@/hooks/use-live-matches";
import { StreamLink } from "@/components/StreamLink";

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

interface RosterPlayer {
  id: string;
  number: number;
  position: string;
  photoUrl: string | null;
  player: {
    firstName: string;
    paternalLastName: string;
    maternalLastName: string | null;
    dni: string; // N° CIP
    photoUrl: string | null;
  };
}

interface TeamDetail {
  id: string;
  name: string;
  shieldUrl: string | null;
  delegate: { firstName: string; paternalLastName: string; maternalLastName: string | null } | null;
  rosterEntries: RosterPlayer[];
}

interface Match {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
  streamUrl: string | null;
  round: string;
  roundLabel: string | null;
  homeTeam: { id: string; name: string; shieldUrl: string | null } | null;
  awayTeam: { id: string; name: string; shieldUrl: string | null } | null;
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
  inscripciones: "bg-primary/20 text-primary border-primary/40",
  en_curso:      "bg-accent/20 text-accent border-accent/50",
  finalizado:    "bg-white/10 text-white/80 border-white/25",
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
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol", ajedrez: "Ajedrez",
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

function fullName(p: { firstName: string; paternalLastName: string; maternalLastName: string | null }) {
  return [p.paternalLastName, p.maternalLastName, p.firstName].filter(Boolean).join(" ");
}

function initials(p: { firstName: string; paternalLastName: string }) {
  return `${p.paternalLastName.charAt(0)}${p.firstName.charAt(0)}`.toUpperCase();
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
            <p className="text-sm font-semibold text-right leading-tight truncate">{match.homeTeam?.name ?? "Por definir"}</p>
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
            <p className="text-sm font-semibold leading-tight truncate">{match.awayTeam?.name ?? "Por definir"}</p>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{dt ? `${dt.date} ${dt.time}` : "Sin fecha"}</span>
            <div className="flex items-center gap-1.5">
              <StreamLink url={match.streamUrl} />
              <Badge className={`text-[10px] border-0 ${matchStatusBadge[match.status]}`}>
                {matchStatusLabel[match.status]}
              </Badge>
            </div>
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

  // Modal de planilla del equipo
  const [teamOpen, setTeamOpen]       = useState(false);
  const [teamDetail, setTeamDetail]   = useState<TeamDetail | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  function openTeam(teamId: string) {
    setTeamOpen(true);
    setTeamDetail(null);
    setTeamLoading(true);
    fetch(`/api/public/teams/${teamId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTeamDetail(d))
      .finally(() => setTeamLoading(false));
  }

  useEffect(() => {
    fetch(`/api/public/championships/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        const d = await r.json();
        setData(d);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Marcadores en vivo por WebSocket (scores-backend); carga inicial vía REST arriba
  const { patches, connected } = useLiveMatches(data?.championship ? [data.championship.id] : []);

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

  const { championship, teams } = data;

  // Fusionar el estado en vivo (marcador/estado/equipos) sobre la carga inicial
  const matches: Match[] = data.matches.map((m) => (patches[m.id] ? { ...m, ...patches[m.id] } : m));

  // Etiquetas y orden de las fases de eliminación
  const ROUND_LABEL: Record<string, string> = {
    dieciseisavos: "Dieciseisavos",
    octavos: "Octavos de final",
    cuartos: "Cuartos de final",
    semifinal: "Semifinales",
    tercer_puesto: "Tercer puesto",
    final: "Final",
  };
  const ROUND_ORDER: Record<string, number> = {
    dieciseisavos: 1, octavos: 2, cuartos: 3, semifinal: 4, tercer_puesto: 5, final: 6,
  };

  // Agrupar: si es fase de eliminación, por ronda (Semifinales/3er puesto/Final);
  // si no, por fase → jornada/grupo.
  const grouped: Record<string, { label: string; order: number; matches: Match[] }> = {};

  for (const m of matches) {
    let key = "sin-fase";
    let label = "Partidos";
    let order = 100;

    if (m.round && ROUND_LABEL[m.round]) {
      key = `round-${m.round}`;
      label = ROUND_LABEL[m.round];
      order = ROUND_ORDER[m.round];
    } else if (m.phase) {
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

    if (!grouped[key]) grouped[key] = { label, order, matches: [] };
    grouped[key].matches.push(m);
  }

  const groupedEntries = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="container py-8">
      <Link
        href="/campeonatos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a campeonatos
      </Link>

      {/* Header */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-secondary p-6 md:p-8 ring-1 ring-white/10">
        {/* Glows decorativos de marca */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {championship.logoUrl ? (
              <img src={championship.logoUrl} alt={championship.name} className="h-16 w-16 rounded-xl object-cover ring-2 ring-white/15" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <Badge variant="outline" className={`text-xs ${statusBadge[championship.status]}`}>
                {statusLabel[championship.status]}
              </Badge>
              <h1 className="mt-2 font-display text-4xl md:text-5xl text-white drop-shadow">
                {championship.name}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                {sportLabel[championship.sport] ?? championship.sport}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-secondary-foreground/80">
            {championship.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary/80" /> {championship.location}
              </span>
            )}
            {championship.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary/80" />
                {formatDate(championship.startDate)}
                {championship.endDate ? ` — ${formatDate(championship.endDate)}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary/80" />
              {teams.length}{championship.maxEquipos > 0 ? ` / ${championship.maxEquipos}` : ""} equipos
            </span>
          </div>
        </div>

        {championship.description && (
          <p className="relative mt-4 max-w-2xl text-sm text-secondary-foreground/70">
            {championship.description}
          </p>
        )}
      </div>

      {/* Vista unificada: Equipos arriba, Fixture abajo */}
      <div className="mt-8 space-y-10">

        {/* ── Equipos ── */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2.5 text-2xl font-bold text-foreground uppercase tracking-wide border-b pb-2">
            <Users className="h-6 w-6 text-primary" /> Equipos ({teams.length})
          </h2>
          {teams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">Sin equipos inscritos aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {teams.map((t) => (
                <Card
                  key={t.id}
                  onClick={() => openTeam(t.id)}
                  className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    {t.shieldUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.shieldUrl} alt={t.name} className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-border" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/25 shrink-0">
                        <span className="text-sm font-bold text-primary">{t.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t._count.rosterEntries} {t._count.rosterEntries === 1 ? "jugador" : "jugadores"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Fixture ── */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2.5 text-2xl font-bold text-foreground uppercase tracking-wide border-b pb-2">
            <Swords className="h-6 w-6 text-primary" /> Fixture
            {connected && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-green-600 normal-case tracking-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> En vivo
              </span>
            )}
          </h2>
          {matches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Swords className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">Sin partidos programados aún</p>
              </CardContent>
            </Card>
          ) : (
            // Grupos/rondas en una misma línea (1 columna en móvil para no desbordar)
            <div className="grid items-start gap-6 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {groupedEntries.map(([key, { label, matches: groupMatches }]) => (
                <div key={key} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground uppercase tracking-wide border-b-2 border-primary/40 pb-2">
                    <span className="h-5 w-1.5 rounded-full bg-primary" />
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {groupMatches.map((m) => <MatchRow key={m.id} match={m} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal de planilla del equipo */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl [&>button]:text-white [&>button]:opacity-80 hover:[&>button]:opacity-100">
          {/* Header con gradiente de marca */}
          <DialogHeader className="space-y-0 bg-gradient-to-br from-primary via-primary to-emerald-600 p-5 text-left text-white">
            <div className="flex items-center gap-3.5">
              {teamDetail?.shieldUrl ? (
                <img src={teamDetail.shieldUrl} alt={teamDetail.name} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/40" />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
                  <span className="text-lg font-bold text-white">{(teamDetail?.name ?? "?").charAt(0)}</span>
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-bold text-white">
                  {teamDetail?.name ?? "Cargando…"}
                </DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/85">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {teamLoading
                      ? "Cargando…"
                      : `${teamDetail?.rosterEntries.length ?? 0} ${(teamDetail?.rosterEntries.length ?? 0) === 1 ? "inscrito" : "inscritos"}`}
                  </span>
                  {teamDetail?.delegate && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="inline-flex items-center gap-1 text-white/75">
                        <ShieldCheck className="h-3.5 w-3.5" /> {fullName(teamDetail.delegate)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Lista de jugadores */}
          {teamLoading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !teamDetail || teamDetail.rosterEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">Sin jugadores inscritos aún</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[58vh]">
              <ul className="p-2">
                {teamDetail.rosterEntries.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary">
                      {r.number}
                    </span>
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                      <AvatarImage src={r.player.photoUrl ?? r.photoUrl ?? undefined} alt={fullName(r.player)} />
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(r.player)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{fullName(r.player)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.position} · CIP {r.player.dni}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
