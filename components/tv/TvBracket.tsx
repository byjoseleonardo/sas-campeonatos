"use client";

import { Loader2, Trophy, Medal, Crown, WifiOff } from "lucide-react";
import type { BracketMatchState, BracketState } from "@/hooks/use-bracket-poll";
import { useBracketSocket } from "@/hooks/use-bracket-socket";

// ─────────────────────────────────────────────────────────────────────────────
// Vista de llave para TV (columna vertical, estilo bosquejo):
//   SEMIFINALES → Semi 1 / Semi 2     ·     DEFINICIÓN → Tercer puesto / Final
// Fútbol → datos reales (polling). Vóley → maqueta. Ajedrez → no aplica.
// ─────────────────────────────────────────────────────────────────────────────

interface ChampionshipLite {
  id: string;
  name: string;
  sport: string;
}

const FUNCTIONAL = new Set(["futbol", "futsal"]);

type Variant = "semi" | "final" | "third";

function winnersOf(m: BracketMatchState | null) {
  if (!m || m.status !== "finalizado") return { home: false, away: false };
  if (m.winnerTeamId) {
    return { home: m.winnerTeamId === m.homeTeam?.id, away: m.winnerTeamId === m.awayTeam?.id };
  }
  return { home: m.homeScore > m.awayScore, away: m.awayScore > m.homeScore };
}

function TeamRow({
  team,
  score,
  isWinner,
  done,
  champion,
}: {
  team: BracketMatchState["homeTeam"];
  score: number;
  isWinner: boolean;
  done: boolean;
  champion: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${
        isWinner ? "bg-primary/20" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        {team?.shieldUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.shieldUrl} alt={team.name} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/15" />
        ) : (
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-2 ${team ? "bg-white/10 ring-white/15" : "bg-white/5 ring-white/10"}`}>
            <span className="text-lg font-bold text-white/70">{team?.name?.charAt(0) ?? "?"}</span>
          </div>
        )}
        <span
          className={`truncate text-2xl font-bold tracking-tight ${
            isWinner ? "text-primary" : team ? "text-white" : "text-white/35 italic"
          }`}
        >
          {team?.name ?? "Por definir"}
        </span>
        {champion && isWinner && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/40">
            <Crown className="h-3.5 w-3.5" /> Campeón
          </span>
        )}
      </div>
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg font-display text-3xl tabular-nums ${
          isWinner ? "bg-primary/25 text-primary" : "bg-white/5 text-white/70"
        }`}
      >
        {done ? score : "–"}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  title,
  variant,
  icon,
}: {
  match: BracketMatchState | null;
  title: string;
  variant: Variant;
  icon?: React.ReactNode;
}) {
  const done = match?.status === "finalizado";
  const live = match?.status === "en_curso";
  const w = winnersOf(match);
  const isFinal = variant === "final";

  const ring =
    variant === "final"
      ? "border-amber-400/40 bg-gradient-to-br from-amber-400/[0.07] to-transparent shadow-amber-500/10"
      : variant === "third"
        ? "border-orange-700/40 bg-white/[0.03]"
        : "border-white/12 bg-white/[0.03]";

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-xl ${ring}`}>
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10">
        <span className={`flex items-center gap-2 font-semibold uppercase tracking-[0.15em] ${isFinal ? "text-base text-amber-300" : "text-sm text-white/55"}`}>
          {icon}
          {title}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 text-sm font-bold text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> EN VIVO
          </span>
        ) : done ? (
          <span className="text-xs font-semibold tracking-wider text-white/40">FINALIZADO</span>
        ) : (
          <span className="text-xs font-medium tracking-wider text-white/30">PROGRAMADO</span>
        )}
      </div>
      <div className="divide-y divide-white/10">
        <TeamRow team={match?.homeTeam ?? null} score={match?.homeScore ?? 0} isWinner={w.home} done={!!done} champion={isFinal} />
        <TeamRow team={match?.awayTeam ?? null} score={match?.awayScore ?? 0} isWinner={w.away} done={!!done} champion={isFinal} />
      </div>
    </div>
  );
}

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`h-6 w-1.5 rounded-full ${accent}`} />
      <h3 className="text-lg font-bold uppercase tracking-[0.2em] text-white/70">{children}</h3>
    </div>
  );
}

function ChampionBanner({ final }: { final: BracketMatchState | null }) {
  const w = winnersOf(final);
  const champ = w.home ? final?.homeTeam : w.away ? final?.awayTeam : null;
  if (!champ) return null;
  return (
    <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-amber-400/10 to-amber-400/15 px-6 py-4 shadow-lg shadow-amber-500/10">
      <Trophy className="h-7 w-7 text-amber-300" />
      <p className="text-xl font-bold tracking-tight text-amber-100">
        Campeón: <span className="text-amber-300">{champ.name}</span>
      </p>
      <Trophy className="h-7 w-7 text-amber-300" />
    </div>
  );
}

function BracketLayout({ state }: { state: BracketState }) {
  const semi1 = state.semifinals[0] ?? null;
  const semi2 = state.semifinals[1] ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ChampionBanner final={state.final} />

      {/* Semifinales (columna: 1 arriba, 2 abajo) */}
      <section>
        <SectionTitle accent="bg-primary">Semifinales</SectionTitle>
        <div className="flex flex-col gap-4">
          <MatchCard match={semi1} title="Semifinal 1" variant="semi" />
          <MatchCard match={semi2} title="Semifinal 2" variant="semi" />
        </div>
      </section>

      {/* Definición (columna: tercer puesto arriba, final abajo) */}
      <section>
        <SectionTitle accent="bg-amber-400">Definición</SectionTitle>
        <div className="flex flex-col gap-4">
          {state.thirdPlace && (
            <MatchCard
              match={state.thirdPlace}
              title="Tercer puesto"
              variant="third"
              icon={<Medal className="h-4 w-4 text-orange-400" />}
            />
          )}
          <MatchCard
            match={state.final}
            title="Final"
            variant="final"
            icon={<Trophy className="h-5 w-5 text-amber-300" />}
          />
        </div>
      </section>
    </div>
  );
}

// Maqueta de vóley (sin datos reales aún)
const VOLLEY_MOCK: BracketState = {
  semifinals: [
    { id: "v1", round: "semifinal", roundLabel: "Semifinal 1", status: "programado", homeScore: 0, awayScore: 0, winnerTeamId: null, scheduledAt: null, venue: null, homeTeam: { id: "a", name: "Equipo A", shieldUrl: null }, awayTeam: { id: "b", name: "Equipo B", shieldUrl: null } },
    { id: "v2", round: "semifinal", roundLabel: "Semifinal 2", status: "programado", homeScore: 0, awayScore: 0, winnerTeamId: null, scheduledAt: null, venue: null, homeTeam: { id: "c", name: "Equipo C", shieldUrl: null }, awayTeam: { id: "d", name: "Equipo D", shieldUrl: null } },
  ],
  final: { id: "vf", round: "final", roundLabel: "Final", status: "programado", homeScore: 0, awayScore: 0, winnerTeamId: null, scheduledAt: null, venue: null, homeTeam: null, awayTeam: null },
  thirdPlace: { id: "v3", round: "tercer_puesto", roundLabel: "Tercer puesto", status: "programado", homeScore: 0, awayScore: 0, winnerTeamId: null, scheduledAt: null, venue: null, homeTeam: null, awayTeam: null },
};

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-white/40">{children}</div>;
}

export default function TvBracket({ championship }: { championship: ChampionshipLite | null }) {
  const isFunctional = championship ? FUNCTIONAL.has(championship.sport) : false;
  const { state, connected } = useBracketSocket(isFunctional ? championship!.id : null);

  if (!championship) {
    return <Centered><Trophy className="h-12 w-12 opacity-20" /><p className="text-lg">Selecciona un campeonato</p></Centered>;
  }

  if (championship.sport === "ajedrez") {
    return <Centered><Trophy className="h-12 w-12 opacity-20" /><p className="text-lg">Llave no disponible para ajedrez</p></Centered>;
  }

  // Vóley: maqueta
  if (!isFunctional) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-center text-sm font-semibold text-amber-300">
          Vista de muestra · la lógica de la llave de vóley aún no está habilitada
        </div>
        <BracketLayout state={VOLLEY_MOCK} />
      </div>
    );
  }

  // Fútbol: datos reales por WebSocket
  // Sin conexión al servidor de tiempo real (scores-backend apagado/no desplegado)
  if (!connected && !state) {
    return (
      <Centered>
        <WifiOff className="h-12 w-12 opacity-30" />
        <p className="text-lg">Sin conexión con el servidor en vivo</p>
        <p className="text-sm opacity-70">Verifica que <span className="font-mono">scores-backend</span> esté ejecutándose</p>
      </Centered>
    );
  }

  // Conectado pero aún sin el primer estado
  if (!state) {
    return <Centered><Loader2 className="h-8 w-8 animate-spin" /></Centered>;
  }

  const hasBracket = state.semifinals.length > 0 || state.final;
  if (!hasBracket) {
    return <Centered><Trophy className="h-12 w-12 opacity-20" /><p className="text-lg">La llave aún no ha sido generada</p></Centered>;
  }

  return (
    <div className="space-y-4">
      {/* Indicador de conexión en vivo */}
      <div className="flex justify-end">
        {connected ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> EN VIVO
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <WifiOff className="h-3.5 w-3.5" /> Reconectando…
          </span>
        )}
      </div>
      <BracketLayout state={state} />
    </div>
  );
}
