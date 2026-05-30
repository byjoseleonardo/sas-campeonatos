"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, Minus, Trophy, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Team { id: string; name: string }
interface VSet { setNumber: number; homePoints: number; awayPoints: number; status: string; winnerTeamId: string | null }

export interface VolleyState {
  id: string;
  status: string;
  homeScore: number; // sets ganados local
  awayScore: number; // sets ganados visitante
  currentSet: number | null;
  winnerTeamId: string | null;
  setsToWin: number | null;
  pointsPerSet: number | null;
  decidingSetPoints: number | null;
  winByMargin: number | null;
  capPoints: number | null;
  homeTeam: Team;
  awayTeam: Team;
  sets: VSet[];
}

// Avatar simple del equipo (inicial).
function Avatar({ name, big }: { name: string; big?: boolean }) {
  return (
    <div className={`${big ? "h-12 w-12 text-xl" : "h-9 w-9 text-sm"} shrink-0 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function VolleyConsole({
  matchId,
  initial,
  champName,
  roundLabel,
}: {
  matchId: string;
  initial: VolleyState;
  champName: string;
  roundLabel: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [vs, setVs] = useState<VolleyState>(initial);
  const [busy, setBusy] = useState(false);

  // Config que define la mesa al iniciar.
  const [setsToWin, setSetsToWin] = useState(3); // 3 = mejor de 5, 2 = mejor de 3
  const [pointsPerSet, setPointsPerSet] = useState(25);
  const [decidingOn, setDecidingOn] = useState(true);
  const [decidingPoints, setDecidingPoints] = useState(15);
  const [margin, setMargin] = useState(2);
  const [capOn, setCapOn] = useState(false);
  const [cap, setCap] = useState(27);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/volley/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setsToWin,
          pointsPerSet,
          decidingSetPoints: decidingOn ? decidingPoints : null,
          winByMargin: margin,
          capPoints: capOn ? cap : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVs(data);
      toast({ title: "Partido iniciado" });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function point(team: "home" | "away", delta: 1 | -1) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tecnico/matches/${matchId}/volley/point`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVs(data);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const current = vs.sets.find((s) => s.setNumber === vs.currentSet) ?? null;
  const finishedSets = vs.sets.filter((s) => s.status === "finalizado").sort((a, b) => a.setNumber - b.setNumber);
  const bestOf = setsToWin === 2 ? 3 : 5;

  const back = (
    <button
      onClick={() => router.push("/tecnico/partidos")}
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Volver
    </button>
  );

  const header = (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{champName}{roundLabel ? ` · ${roundLabel}` : ""}</p>
      <h1 className="font-display text-2xl tracking-wide">{vs.homeTeam.name} vs {vs.awayTeam.name}</h1>
    </div>
  );

  // ── Estado: PROGRAMADO → configurar e iniciar ──────────────────────────────
  if (vs.status !== "en_curso" && vs.status !== "finalizado") {
    return (
      <div className="space-y-5">
        {back}
        {header}
        <Card>
          <CardContent className="space-y-5 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" /> Configuración del partido (vóley)
            </p>

            {/* Formato */}
            <div className="space-y-2">
              <Label>Formato</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={setsToWin === 2 ? "default" : "outline"} onClick={() => setSetsToWin(2)}>
                  Al mejor de 3
                </Button>
                <Button type="button" variant={setsToWin === 3 ? "default" : "outline"} onClick={() => setSetsToWin(3)}>
                  Al mejor de 5
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Gana el primero en llegar a {setsToWin} sets.</p>
            </div>

            {/* Puntos por set + ventaja */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Puntos por set</Label>
                <Input type="number" min={1} max={99} value={pointsPerSet}
                  onChange={(e) => setPointsPerSet(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ventaja para cerrar</Label>
                <Input type="number" min={1} max={10} value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))} />
              </div>
            </div>

            {/* Set decisivo opcional */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Set decisivo con puntaje distinto</Label>
                <Switch checked={decidingOn} onCheckedChange={setDecidingOn} />
              </div>
              {decidingOn && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Puntos del set decisivo (el último)</Label>
                  <Input type="number" min={1} max={99} value={decidingPoints}
                    onChange={(e) => setDecidingPoints(Number(e.target.value))} />
                </div>
              )}
            </div>

            {/* Tope opcional */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Tope de puntos (corte sin ventaja)</Label>
                <Switch checked={capOn} onCheckedChange={setCapOn} />
              </div>
              {capOn && (
                <div className="space-y-1.5">
                  <Label className="text-xs">El set se corta al llegar a</Label>
                  <Input type="number" min={1} max={99} value={cap}
                    onChange={(e) => setCap(Number(e.target.value))} />
                </div>
              )}
            </div>

            <Button className="w-full gap-2" size="lg" onClick={start} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Iniciar partido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Marcador de sets (común a en_curso y finalizado) ───────────────────────
  const champion = vs.winnerTeamId === vs.homeTeam.id ? vs.homeTeam : vs.winnerTeamId === vs.awayTeam.id ? vs.awayTeam : null;

  const setsScoreboard = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className={`truncate font-semibold ${champion?.id === vs.homeTeam.id ? "text-primary" : ""}`}>{vs.homeTeam.name}</span>
        <Avatar name={vs.homeTeam.name} big />
      </div>
      <div className="flex items-center gap-2 px-2 font-display text-5xl tabular-nums">
        <span className={champion?.id === vs.homeTeam.id ? "text-primary" : ""}>{vs.homeScore}</span>
        <span className="text-muted-foreground text-2xl">–</span>
        <span className={champion?.id === vs.awayTeam.id ? "text-primary" : ""}>{vs.awayScore}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={vs.awayTeam.name} big />
        <span className={`truncate font-semibold ${champion?.id === vs.awayTeam.id ? "text-primary" : ""}`}>{vs.awayTeam.name}</span>
      </div>
    </div>
  );

  const setsHistory = finishedSets.length > 0 && (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sets</p>
      <div className="space-y-1">
        {finishedSets.map((s) => (
          <div key={s.setNumber} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Set {s.setNumber}</span>
            <span className="font-display text-lg tabular-nums">
              <span className={s.winnerTeamId === vs.homeTeam.id ? "font-bold text-primary" : ""}>{s.homePoints}</span>
              <span className="mx-1.5 text-muted-foreground">–</span>
              <span className={s.winnerTeamId === vs.awayTeam.id ? "font-bold text-primary" : ""}>{s.awayPoints}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Estado: FINALIZADO ─────────────────────────────────────────────────────
  if (vs.status === "finalizado") {
    return (
      <div className="space-y-5">
        {back}
        {header}
        {champion && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-700 dark:text-amber-300">
            <Trophy className="h-5 w-5" />
            <span className="font-semibold">Ganador: {champion.name}</span>
          </div>
        )}
        <Card><CardContent className="space-y-5 p-5">{setsScoreboard}{setsHistory}</CardContent></Card>
      </div>
    );
  }

  // ── Estado: EN CURSO ───────────────────────────────────────────────────────
  const hp = current?.homePoints ?? 0;
  const ap = current?.awayPoints ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {back}
        <Badge className="border-green-500/30 bg-green-500/20 text-green-600">EN CURSO</Badge>
      </div>
      {header}

      <Card>
        <CardContent className="space-y-5 p-5">
          {setsScoreboard}
          <p className="text-center text-xs text-muted-foreground">
            Mejor de {bestOf} · {vs.pointsPerSet} pts · ventaja {vs.winByMargin ?? 2}
            {vs.decidingSetPoints != null ? ` · decisivo a ${vs.decidingSetPoints}` : ""}
            {vs.capPoints != null ? ` · tope ${vs.capPoints}` : ""}
          </p>
        </CardContent>
      </Card>

      {/* Set actual */}
      <Card className="border-primary/30">
        <CardContent className="space-y-4 p-5">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Set {vs.currentSet}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {([
              { side: "home" as const, team: vs.homeTeam, pts: hp },
              { side: "away" as const, team: vs.awayTeam, pts: ap },
            ]).map(({ side, team, pts }) => (
              <div key={side} className="flex flex-col items-center gap-3">
                <span className="w-full truncate text-center text-sm font-semibold">{team.name}</span>
                <span className="font-display text-6xl tabular-nums leading-none">{pts}</span>
                <Button className="h-16 w-full text-2xl" size="lg" disabled={busy} onClick={() => point(side, 1)}>
                  <Plus className="h-7 w-7" />
                </Button>
                <Button variant="outline" className="w-full gap-1.5 text-muted-foreground" disabled={busy || pts === 0} onClick={() => point(side, -1)}>
                  <Minus className="h-4 w-4" /> Quitar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {setsHistory}
    </div>
  );
}
