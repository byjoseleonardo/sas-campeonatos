"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Play, Square, AlertTriangle, ClipboardList, Gamepad2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VolleyConsole from "@/components/tecnico/VolleyConsole";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Player { id: string; firstName: string; paternalLastName: string; maternalLastName?: string | null; dni?: string }
interface Team   { id: string; name: string }

interface RosterEntry {
  id: string;
  number: number;
  position: string;
  player: Player;
}

interface MatchEvent {
  id: string;
  eventType: string;
  minute: number;
  team:   Team;
  player: Player;
}

interface MatchDetail {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
  roundLabel: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  championship: { id: string; name: string; sport: string };
  phase: { id: string; name: string } | null;
  events: MatchEvent[];
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
  // Vóley (presentes cuando el campeonato es de vóley)
  currentSet: number | null;
  winnerTeamId: string | null;
  setsToWin: number | null;
  pointsPerSet: number | null;
  decidingSetPoints: number | null;
  winByMargin: number | null;
  capPoints: number | null;
  sets: { setNumber: number; homePoints: number; awayPoints: number; status: string; winnerTeamId: string | null }[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const eventLabels: Record<string, string> = {
  gol:           "Gol",
  gol_en_contra: "Gol en contra",
  amarilla:      "Amarilla",
  roja:          "Roja",
  roja_directa:  "Roja directa",
};

const eventIcon: Record<string, string> = {
  gol:           "⚽",
  gol_en_contra: "⚽",
  amarilla:      "🟨",
  roja:          "🟥",
  roja_directa:  "🟥",
};

const statusLabel: Record<string, string> = {
  programado: "Programado",
  en_curso:   "En curso",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  postergado: "Postergado",
};

const statusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_curso:   "bg-green-500/20 text-green-500 border-green-500/30",
  finalizado: "bg-muted text-muted-foreground",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

const statusBarColor: Record<string, string> = {
  programado: "bg-muted/40 text-muted-foreground",
  en_curso:   "bg-green-500/15 text-green-500 border border-green-500/20",
  finalizado: "bg-muted/40 text-muted-foreground",
  suspendido: "bg-destructive/10 text-destructive",
  postergado: "bg-amber-500/10 text-amber-600",
};

// ─── Componente avatar de equipo ──────────────────────────────────────────────

function TeamAvatar({ name }: { name: string }) {
  return (
    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

type Tab = "control" | "planilla";
type QuickEventType = "gol" | "amarilla" | "roja";

export default function MatchControlPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [match, setMatch]     = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [tab, setTab]         = useState<Tab>("control");

  // Mini-modal para registrar evento rápido
  const [quickOpen, setQuickOpen]       = useState(false);
  const [quickTeamId, setQuickTeamId]   = useState("");
  const [quickType, setQuickType]       = useState<QuickEventType>("gol");
  const [quickPlayerId, setQuickPlayerId] = useState("");
  const [quickMinute, setQuickMinute]   = useState<number | "">("");
  const [quickSaving, setQuickSaving]   = useState(false);

  // Walkover
  const [woOpen, setWoOpen]     = useState(false);
  const [woWinner, setWoWinner] = useState("");
  const [woActing, setWoActing] = useState(false);

  // Confirmar finalizar
  const [finalizarOpen, setFinalizarOpen] = useState(false);

  // Definición por penales (empate al finalizar)
  const [penalesOpen, setPenalesOpen]     = useState(false);
  const [penalesWinner, setPenalesWinner] = useState("");

  // Eliminar evento
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}`);
      const data = await res.json();
      if (res.ok) setMatch(data);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  // ─── Acciones del partido ────────────────────────────────────────────────

  const handleAction = async (action: "iniciar" | "finalizar", winnerTeamId?: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(winnerTeamId ? { winnerTeamId } : {}) }),
      });
      const data = await res.json();
      // Empate: el servidor exige definir ganador (penales)
      if (res.status === 422 && data.requiresWinner) {
        setFinalizarOpen(false);
        setPenalesWinner("");
        setPenalesOpen(true);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      toast({ title: action === "iniciar" ? "Partido iniciado" : "Partido finalizado" });
      setFinalizarOpen(false);
      setPenalesOpen(false);
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleWalkover = async () => {
    if (!woWinner) return;
    setWoActing(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "walkover", winnerTeamId: woWinner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Walkover registrado" });
      setWoOpen(false);
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setWoActing(false);
    }
  };

  // ─── Evento rápido ───────────────────────────────────────────────────────

  const openQuick = (teamId: string, type: QuickEventType) => {
    setQuickTeamId(teamId);
    setQuickType(type);
    setQuickPlayerId("");
    setQuickMinute("");
    setQuickOpen(true);
  };

  const handleQuickEvent = async () => {
    if (!quickPlayerId || quickMinute === "") {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setQuickSaving(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: quickTeamId,
          eventType: quickType,
          playerId: quickPlayerId,
          minute: Number(quickMinute),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `${eventLabels[quickType]} registrado` });
      setQuickOpen(false);
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setQuickSaving(false);
    }
  };

  // Anular último gol
  const handleAnularGol = async () => {
    if (!match) return;
    const lastGoal = [...match.events]
      .filter((e) => e.eventType === "gol" || e.eventType === "gol_en_contra")
      .sort((a, b) => b.minute - a.minute)[0];
    if (!lastGoal) {
      toast({ title: "No hay goles para anular", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/events/${lastGoal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Último gol anulado" });
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/events/${deleteEventId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Evento eliminado" });
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setDeleteEventId(null);
    }
  };

  // ─── Derivados ───────────────────────────────────────────────────────────

  const quickRoster = match
    ? quickTeamId === match.homeTeamId ? match.homeRoster : match.awayRoster
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!match) {
    return <p className="text-center py-12 text-muted-foreground">Partido no encontrado.</p>;
  }

  // Partido de llave aún sin equipos definidos (ganador/perdedor de semifinales)
  if (!match.homeTeam || !match.awayTeam) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/tecnico/partidos")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">{match.roundLabel ?? "Partido"} — equipos por definir</p>
            <p className="text-sm text-muted-foreground">
              Este partido se habilitará cuando se definan los equipos clasificados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vóley: consola de sets (reemplaza la consola de fútbol para este deporte)
  if (match.championship.sport === "voleibol") {
    return (
      <VolleyConsole
        matchId={matchId}
        initial={match}
        champName={match.championship.name}
        roundLabel={match.roundLabel}
      />
    );
  }

  const isLive     = match.status === "en_curso";
  const isDone     = match.status === "finalizado";
  const canStart   = match.status === "programado" || match.status === "postergado";
  const canWO      = !isDone;

  const sortedEvents = [...match.events].sort((a, b) => a.minute - b.minute);

  return (
    <div className="space-y-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/tecnico/partidos")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">Gestión de Partido</p>
          <p className="text-[11px] text-muted-foreground">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </p>
        </div>
        <Badge className={`text-[11px] border ${statusBadge[match.status]}`}>
          {isLive && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />}
          {statusLabel[match.status].toUpperCase()}
        </Badge>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border mb-4">
        {(["control", "planilla"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "planilla" ? <ClipboardList className="h-3.5 w-3.5" /> : <Gamepad2 className="h-3.5 w-3.5" />}
            {t === "planilla" ? "Planilla" : "Control"}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: CONTROL ══════════════ */}
      {tab === "control" && (
        <div className="space-y-4">

          {/* Status bar */}
          <div className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 ${statusBarColor[match.status]}`}>
            {isLive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            Estado: {statusLabel[match.status]}
          </div>

          {/* Marcador */}
          <Card className={isLive ? "border-green-500/30 ring-1 ring-green-500/20" : ""}>
            <CardContent className="p-5">
              {isLive && (
                <p className="text-center text-[11px] font-semibold text-green-500 tracking-widest mb-3 flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  EN VIVO
                </p>
              )}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Local */}
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-bold text-right leading-tight line-clamp-2">{match.homeTeam.name}</p>
                  <TeamAvatar name={match.homeTeam.name} />
                </div>

                {/* Marcador central */}
                <div className="flex flex-col items-center gap-0.5 px-3">
                  <span className="font-display text-5xl font-bold tabular-nums text-foreground">
                    {match.homeScore}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium">vs</span>
                  <span className="font-display text-5xl font-bold tabular-nums text-foreground">
                    {match.awayScore}
                  </span>
                </div>

                {/* Visitante */}
                <div className="flex items-center gap-2 justify-start">
                  <TeamAvatar name={match.awayTeam.name} />
                  <p className="text-sm font-bold leading-tight line-clamp-2">{match.awayTeam.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Acciones</h2>
            <Card>
              <CardContent className="p-4 space-y-4">

                {/* Botones por equipo */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {[
                    { team: match.homeTeam, teamId: match.homeTeamId, label: "LOCAL" },
                    { team: match.awayTeam, teamId: match.awayTeamId, label: "VISITANTE" },
                  ].map(({ team, teamId, label }) => (
                    <div key={teamId} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <TeamAvatar name={team.name} />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                          <p className="text-xs font-semibold leading-tight">{team.name}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                        {/* Gol */}
                        <button
                          disabled={!isLive}
                          onClick={() => openQuick(teamId, "gol")}
                          className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-xl">⚽</span>
                          <span className="text-[10px]">Gol</span>
                        </button>
                        {/* Amarilla */}
                        <button
                          disabled={!isLive}
                          onClick={() => openQuick(teamId, "amarilla")}
                          className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-xl">🟨</span>
                          <span className="text-[10px]">Amarilla</span>
                        </button>
                        {/* Roja */}
                        <button
                          disabled={!isLive}
                          onClick={() => openQuick(teamId, "roja")}
                          className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-xl">🟥</span>
                          <span className="text-[10px]">Roja</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fila de controles del partido */}
                <div className="flex flex-wrap items-center justify-between border-t border-border pt-3 gap-2">
                  {/* Anular gol */}
                  <button
                    disabled={!isLive}
                    onClick={handleAnularGol}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Anular gol
                  </button>

                  {/* Iniciar / Finalizar */}
                  {canStart && (
                    <Button size="sm" onClick={() => handleAction("iniciar")} disabled={acting} className="h-8 gap-1.5">
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Iniciar
                    </Button>
                  )}
                  {isLive && (
                    <Button size="sm" variant="outline" onClick={() => setFinalizarOpen(true)} disabled={acting} className="h-8 gap-1.5">
                      <Square className="h-3.5 w-3.5" /> Finalizar
                    </Button>
                  )}

                  {/* Walkover */}
                  {canWO && (
                    <button
                      onClick={() => { setWoWinner(""); setWoOpen(true); }}
                      className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive transition-colors"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      W.O.
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eventos del partido */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Eventos del Partido</h2>

            {sortedEvents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Sin eventos registrados aún.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {/* Cabecera */}
                  <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2 border-b border-border">
                    <span className="min-w-0 truncate">{match.homeTeam.name}</span>
                    <span className="text-center px-4">Eventos</span>
                    <span className="min-w-0 truncate text-right">{match.awayTeam.name}</span>
                  </div>

                  {/* Filas */}
                  <div className="divide-y divide-border/50">
                    {sortedEvents.map((ev) => {
                      const isHome = ev.team.id === match.homeTeamId;
                      const playerName = [ev.player.firstName, ev.player.paternalLastName].filter(Boolean).join(" ");
                      return (
                        <button
                          key={ev.id}
                          disabled={isDone}
                          onClick={() => !isDone && setDeleteEventId(ev.id)}
                          className="w-full grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5 hover:bg-muted/50 transition-colors disabled:cursor-default text-left"
                        >
                          {/* Columna local */}
                          <div className={isHome ? "flex flex-col" : ""}>
                            {isHome && (
                              <>
                                <span className="text-xs font-medium text-foreground leading-tight">{playerName}</span>
                                <span className="text-[10px] text-muted-foreground">{ev.minute}&apos;</span>
                              </>
                            )}
                          </div>

                          {/* Icono central */}
                          <div className="flex flex-col items-center px-3">
                            <span className="text-base">{eventIcon[ev.eventType]}</span>
                            {ev.eventType === "gol_en_contra" && (
                              <span className="text-[9px] text-muted-foreground">e.c.</span>
                            )}
                          </div>

                          {/* Columna visitante */}
                          <div className={!isHome ? "flex flex-col items-end" : ""}>
                            {!isHome && (
                              <>
                                <span className="text-xs font-medium text-foreground leading-tight text-right">{playerName}</span>
                                <span className="text-[10px] text-muted-foreground">{ev.minute}&apos;</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: PLANILLA ══════════════ */}
      {tab === "planilla" && (
        <div className="space-y-4">
          {[
            { label: "LOCAL", team: match.homeTeam, roster: match.homeRoster },
            { label: "VISITANTE", team: match.awayTeam, roster: match.awayRoster },
          ].map(({ label, team, roster }) => (
            <div key={team.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <TeamAvatar name={team.name} />
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm font-semibold">{team.name}</p>
                </div>
              </div>
              {roster.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Sin jugadores inscritos.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {roster.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                            #{r.number}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {[r.player.firstName, r.player.paternalLastName, r.player.maternalLastName].filter(Boolean).join(" ")}
                            </p>
                            {r.player.dni && (
                              <p className="text-[10px] text-muted-foreground">{r.player.dni}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{r.position}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Mini-modal: registrar evento rápido ── */}
      <Dialog open={quickOpen} onOpenChange={(v) => !v && setQuickOpen(false)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{eventIcon[quickType]}</span>
              {eventLabels[quickType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Jugador</Label>
              <Select value={quickPlayerId} onValueChange={setQuickPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar jugador" />
                </SelectTrigger>
                <SelectContent>
                  {quickRoster.map((r) => (
                    <SelectItem key={r.player.id} value={r.player.id}>
                      #{r.number} {[r.player.firstName, r.player.paternalLastName].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minuto</Label>
              <Input
                type="number" min={1} max={200}
                placeholder="Ej: 23"
                value={quickMinute}
                onChange={(e) => setQuickMinute(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickEvent} disabled={quickSaving}>
              {quickSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Walkover ── */}
      <Dialog open={woOpen} onOpenChange={(v) => !v && setWoOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Walkover (W.O.)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El equipo ganador recibe <strong>3 — 0</strong>. Esta acción finaliza el partido.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">¿Qué equipo gana el W.O.?</Label>
              <Select value={woWinner} onValueChange={setWoWinner}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ganador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeTeamId}>{match.homeTeam.name} (Local)</SelectItem>
                  <SelectItem value={match.awayTeamId}>{match.awayTeam.name} (Visitante)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {woWinner && (
              <div className="rounded-lg bg-muted/60 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Resultado final</p>
                <p className="font-display text-lg font-bold">
                  {woWinner === match.homeTeamId
                    ? `${match.homeTeam.name} 3 — 0 ${match.awayTeam.name}`
                    : `${match.homeTeam.name} 0 — 3 ${match.awayTeam.name}`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWoOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleWalkover}
              disabled={!woWinner || woActing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {woActing && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirmar W.O.
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar finalizar ── */}
      <AlertDialog open={finalizarOpen} onOpenChange={setFinalizarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar el partido?</AlertDialogTitle>
            <AlertDialogDescription>
              El marcador quedará <strong>{match.homeScore} — {match.awayScore}</strong>. No podrás agregar más eventos después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction("finalizar")} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Definición por penales (empate) ── */}
      <Dialog open={penalesOpen} onOpenChange={(v) => !v && setPenalesOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Definición por penales</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El partido terminó <strong>{match.homeScore} — {match.awayScore}</strong> (empate).
              Selecciona el equipo que ganó en la definición por penales.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Equipo ganador</Label>
              <Select value={penalesWinner} onValueChange={setPenalesWinner}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ganador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeTeamId}>{match.homeTeam.name}</SelectItem>
                  <SelectItem value={match.awayTeamId}>{match.awayTeam.name}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPenalesOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => handleAction("finalizar", penalesWinner)}
              disabled={!penalesWinner || acting}
            >
              {acting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirmar ganador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar evento ── */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(v) => !v && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Si era un gol, el marcador se actualizará automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
