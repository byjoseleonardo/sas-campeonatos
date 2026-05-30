"use client";

import { use } from "react";
import { useMatchLive } from "@/hooks/use-match-live";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { StreamLink } from "@/components/StreamLink";

// ─── Constantes ───────────────────────────────────────────────────────────────

const eventIcon: Record<string, string> = {
  gol:           "⚽",
  gol_en_contra: "⚽",
  amarilla:      "🟨",
  roja:          "🟥",
  roja_directa:  "🟥",
};

const eventLabels: Record<string, string> = {
  gol:           "Gol",
  gol_en_contra: "Gol en contra",
  amarilla:      "Tarjeta amarilla",
  roja:          "Tarjeta roja",
  roja_directa:  "Roja directa",
};

const statusLabel: Record<string, string> = {
  programado: "Programado",
  en_curso:   "En curso",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  postergado: "Postergado",
};

const statusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground border-muted",
  en_curso:   "bg-green-500/20 text-green-500 border-green-500/30",
  finalizado: "bg-muted text-muted-foreground border-muted",
  suspendido: "bg-destructive/15 text-destructive border-destructive/20",
  postergado: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

// ─── Avatar de equipo ─────────────────────────────────────────────────────────

function TeamAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-sm", md: "h-12 w-12 text-base", lg: "h-16 w-16 text-xl" };
  return (
    <div className={`${sizes[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { match, connected } = useMatchLive(matchId);

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Conectando al partido...</p>
        </div>
      </div>
    );
  }

  const isLive   = match.status === "en_curso";
  const isDone   = match.status === "finalizado";
  const isVolley = match.sport === "voleibol";
  const currentSetObj = match.sets?.find((s) => s.setNumber === match.currentSet) ?? null;
  const sortedEvents = [...match.events].sort((a, b) => a.minute - b.minute);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{match.championship.name}</p>
          {match.phase && (
            <p className="text-[11px] text-muted-foreground">
              {match.phase.name}{match.roundLabel ? ` · ${match.roundLabel}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StreamLink url={match.streamUrl} size="md" showLabel />
          <Badge className={`text-[11px] border ${statusBadge[match.status]}`}>
            {isLive && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />}
            {statusLabel[match.status].toUpperCase()}
          </Badge>
          {connected
            ? <Wifi className="h-3.5 w-3.5 text-green-500" />
            : <WifiOff className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
          }
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Marcador */}
        <Card className={isLive ? "border-green-500/30 ring-1 ring-green-500/20" : ""}>
          <CardContent className="p-6">
            {isLive && (
              <p className="text-center text-[11px] font-semibold text-green-500 tracking-widest mb-4 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                EN VIVO
              </p>
            )}
            {isDone && (
              <p className="text-center text-[11px] text-muted-foreground tracking-widest mb-4">
                PARTIDO FINALIZADO
              </p>
            )}

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Local */}
              <div className="flex flex-col items-center gap-2">
                <TeamAvatar name={match.homeTeam?.name ?? "?"} size="lg" />
                <p className="text-xs font-semibold text-center leading-tight">{match.homeTeam?.name ?? "Por definir"}</p>
              </div>

              {/* Marcador */}
              <div className="flex flex-col items-center gap-1 px-2">
                <span className={`font-display text-6xl font-bold tabular-nums ${isLive ? "text-primary" : "text-foreground"}`}>
                  {match.homeScore}
                </span>
                <span className="text-muted-foreground text-xs">—</span>
                <span className={`font-display text-6xl font-bold tabular-nums ${isLive ? "text-primary" : "text-foreground"}`}>
                  {match.awayScore}
                </span>
              </div>

              {/* Visitante */}
              <div className="flex flex-col items-center gap-2">
                <TeamAvatar name={match.awayTeam?.name ?? "?"} size="lg" />
                <p className="text-xs font-semibold text-center leading-tight">{match.awayTeam?.name ?? "Por definir"}</p>
              </div>
            </div>

            {isVolley && (
              <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">Sets ganados</p>
            )}
            {isVolley && isLive && match.currentSet != null && (
              <p className="mt-1 text-center text-sm font-medium">
                Set {match.currentSet}:{" "}
                <span className="font-display text-xl tabular-nums">
                  {currentSetObj?.homePoints ?? 0} – {currentSetObj?.awayPoints ?? 0}
                </span>
              </p>
            )}

            {match.venue && (
              <p className="text-center text-[11px] text-muted-foreground mt-4">
                📍 {match.venue}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sets (vóley) */}
        {isVolley && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Sets</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border/50">
                {(match.sets ?? []).length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">El partido aún no ha comenzado.</p>
                ) : (
                  (match.sets ?? []).map((s) => (
                    <div key={s.setNumber} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        Set {s.setNumber}{s.status !== "finalizado" ? " · en juego" : ""}
                      </span>
                      <span className="font-display text-lg tabular-nums">
                        <span className={s.winnerTeamId === match.homeTeamId ? "font-bold text-primary" : ""}>{s.homePoints}</span>
                        <span className="mx-1.5 text-muted-foreground">–</span>
                        <span className={s.winnerTeamId === match.awayTeamId ? "font-bold text-primary" : ""}>{s.awayPoints}</span>
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Eventos (fútbol/futsal) */}
        {!isVolley && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Eventos del Partido</h2>

          {sortedEvents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLive ? "Esperando eventos..." : "Sin eventos registrados."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Cabecera */}
                <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2 border-b border-border">
                  <span>{match.homeTeam?.name ?? "Por definir"}</span>
                  <span className="px-4">Eventos</span>
                  <span className="text-right">{match.awayTeam?.name ?? "Por definir"}</span>
                </div>

                <div className="divide-y divide-border/50">
                  {sortedEvents.map((ev) => {
                    const isHome = ev.team.id === match.homeTeamId;
                    const playerName = [ev.player.firstName, ev.player.paternalLastName].filter(Boolean).join(" ");
                    return (
                      <div
                        key={ev.id}
                        className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5"
                      >
                        {/* Local */}
                        <div>
                          {isHome && (
                            <>
                              <p className="text-xs font-medium text-foreground leading-tight">{playerName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {eventLabels[ev.eventType]} · {ev.minute}&apos;
                              </p>
                            </>
                          )}
                        </div>

                        {/* Icono */}
                        <div className="flex items-center justify-center px-3">
                          <span className="text-lg">{eventIcon[ev.eventType]}</span>
                        </div>

                        {/* Visitante */}
                        <div className="text-right">
                          {!isHome && (
                            <>
                              <p className="text-xs font-medium text-foreground leading-tight">{playerName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {eventLabels[ev.eventType]} · {ev.minute}&apos;
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground pb-4">
          {connected ? "Conectado en tiempo real" : "Reconectando..."}
        </p>
      </main>
    </div>
  );
}
