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
import { ArrowLeft, Loader2, Plus, Trash2, Play, Square, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  championship: { id: string; name: string };
  phase: { id: string; name: string } | null;
  events: MatchEvent[];
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const eventLabels: Record<string, string> = {
  gol:          "Gol",
  gol_en_contra:"Gol en contra",
  amarilla:     "Amarilla",
  roja:         "Roja",
  roja_directa: "Roja directa",
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
  en_curso:   "bg-primary/15 text-primary",
  finalizado: "bg-green-500/15 text-green-700",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

// ─── Página ───────────────────────────────────────────────────────────────────

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

  // Formulario de evento
  const [eventOpen, setEventOpen]       = useState(false);
  const [eventSaving, setEventSaving]   = useState(false);
  const [eventTeamId, setEventTeamId]   = useState("");
  const [eventType, setEventType]       = useState("");
  const [eventPlayerId, setEventPlayerId] = useState("");
  const [eventMinute, setEventMinute]   = useState<number | "">("");

  // Walkover
  const [woOpen, setWoOpen]           = useState(false);
  const [woWinner, setWoWinner]       = useState("");
  const [woActing, setWoActing]       = useState(false);

  // Confirmar finalizar
  const [finalizarOpen, setFinalizarOpen] = useState(false);

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

  // Refresco automático si está en curso
  useEffect(() => {
    if (match?.status !== "en_curso") return;
    const interval = setInterval(fetchMatch, 15000);
    return () => clearInterval(interval);
  }, [match?.status, fetchMatch]);

  const handleAction = async (action: "iniciar" | "finalizar") => {
    setActing(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: action === "iniciar" ? "Partido iniciado" : "Partido finalizado" });
      setFinalizarOpen(false);
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

  const openEventForm = () => {
    setEventTeamId(""); setEventType(""); setEventPlayerId(""); setEventMinute("");
    setEventOpen(true);
  };

  const handleAddEvent = async () => {
    if (!eventTeamId || !eventType || !eventPlayerId || eventMinute === "") {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setEventSaving(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: eventTeamId, eventType, playerId: eventPlayerId, minute: Number(eventMinute),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `${eventLabels[eventType]} registrado` });
      setEventOpen(false);
      await fetchMatch();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/events/${deleteEventId}`, {
        method: "DELETE",
      });
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

  // Planilla del equipo seleccionado en el form
  const selectedRoster = match
    ? eventTeamId === match.homeTeamId ? match.homeRoster : match.awayRoster
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

  const canStart    = match.status === "programado" || match.status === "postergado";
  const canFinalize = match.status === "en_curso";
  const canWO       = match.status !== "finalizado";
  const canAddEvent = match.status === "en_curso";
  const isDone      = match.status === "finalizado";

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => router.push("/tecnico/partidos")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Mis Partidos
      </button>

      {/* Marcador principal */}
      <Card className={match.status === "en_curso" ? "ring-2 ring-primary/40" : ""}>
        <CardContent className="p-6 space-y-4">
          {/* Campeonato / fase / ronda */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{match.championship.name}</p>
              {match.phase && <p>{match.phase.name}{match.roundLabel ? ` · ${match.roundLabel}` : ""}</p>}
              {match.venue && <p>{match.venue}</p>}
            </div>
            <Badge className={`text-xs border-0 ${statusBadge[match.status]}`}>
              {match.status === "en_curso" && <span className="mr-1.5 h-2 w-2 rounded-full bg-primary animate-pulse inline-block" />}
              {statusLabel[match.status]}
            </Badge>
          </div>

          {/* Equipos + marcador */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
            <p className="text-lg font-bold text-right leading-tight">{match.homeTeam.name}</p>
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-5xl tabular-nums text-foreground">
                {match.homeScore} — {match.awayScore}
              </span>
              {match.status === "en_curso" && (
                <span className="text-xs font-medium text-primary animate-pulse">EN VIVO</span>
              )}
            </div>
            <p className="text-lg font-bold leading-tight">{match.awayTeam.name}</p>
          </div>

          {/* Controles del partido */}
          {!isDone && (
            <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-border/40">
              {canStart && (
                <Button onClick={() => handleAction("iniciar")} disabled={acting} className="gap-2">
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Iniciar partido
                </Button>
              )}
              {canFinalize && (
                <Button
                  variant="outline"
                  onClick={() => setFinalizarOpen(true)}
                  disabled={acting}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" /> Finalizar partido
                </Button>
              )}
              {canWO && (
                <Button
                  variant="outline"
                  onClick={() => { setWoWinner(""); setWoOpen(true); }}
                  className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-4 w-4" /> Walkover (W.O.)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eventos del partido */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Eventos del partido
          </h2>
          {canAddEvent && (
            <Button size="sm" onClick={openEventForm} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Registrar evento
            </Button>
          )}
        </div>

        {match.events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Sin eventos registrados aún.</p>
              {canAddEvent && (
                <Button size="sm" variant="outline" onClick={openEventForm} className="mt-3 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Registrar primer evento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {[...match.events].sort((a, b) => a.minute - b.minute).map((ev) => (
              <Card key={ev.id}>
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
                    {ev.minute}&apos;
                  </span>
                  <span className="text-lg shrink-0">{eventIcon[ev.eventType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {[ev.player.firstName, ev.player.paternalLastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {eventLabels[ev.eventType]} · {ev.team.name}
                    </p>
                  </div>
                  {!isDone && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setDeleteEventId(ev.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: registrar evento */}
      <Dialog open={eventOpen} onOpenChange={(v) => !v && setEventOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar evento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(eventLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {eventIcon[v]} {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Equipo</Label>
              <Select value={eventTeamId} onValueChange={(v) => { setEventTeamId(v); setEventPlayerId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeTeamId}>{match.homeTeam.name} (Local)</SelectItem>
                  <SelectItem value={match.awayTeamId}>{match.awayTeam.name} (Visitante)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Jugador</Label>
              <Select
                value={eventPlayerId}
                onValueChange={setEventPlayerId}
                disabled={!eventTeamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={eventTeamId ? "Seleccionar jugador" : "Selecciona un equipo primero"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedRoster.map((r) => (
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
                value={eventMinute}
                onChange={(e) => setEventMinute(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddEvent} disabled={eventSaving}>
              {eventSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: walkover */}
      <Dialog open={woOpen} onOpenChange={(v) => !v && setWoOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Walkover (W.O.)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El equipo ganador del W.O. recibe el resultado <strong>3 — 0</strong>. Esta acción finaliza el partido.
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
                <p className="font-display text-xl">
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

      {/* Confirmar finalizar */}
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

      {/* Confirmar eliminar evento */}
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
