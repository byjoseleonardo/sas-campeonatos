"use client";

import { Loader2, Trophy, Medal, Crown, WifiOff } from "lucide-react";
import type { BracketMatchState, BracketState } from "@/hooks/use-bracket-poll";
import { useBracketSocket } from "@/hooks/use-bracket-socket";

// ─────────────────────────────────────────────────────────────────────────────
// Vista de llave para TV (columna vertical, estilo transmisión de estadio):
//   SEMIFINALES → Semi 1 / Semi 2     ·     DEFINICIÓN → Tercer puesto / Final
// Fútbol → datos reales (polling). Vóley → maqueta. Ajedrez → no aplica.
// ─────────────────────────────────────────────────────────────────────────────

interface ChampionshipLite {
  id: string;
  name: string;
  sport: string;
}

const FUNCTIONAL = new Set(["futbol", "futsal", "voleibol"]);

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
  variant,
  volleyLive = false,
  setPoints = null,
}: {
  team: BracketMatchState["homeTeam"];
  score: number;
  isWinner: boolean;
  done: boolean;
  champion: boolean;
  variant: Variant;
  volleyLive?: boolean;
  setPoints?: number | null;
}) {
  const gold = variant === "final";
  const accentText = gold && isWinner ? "text-accent" : isWinner ? "text-primary" : team ? "text-white" : "text-white/35 italic";

  return (
    <div className={`relative flex items-center gap-4 px-5 py-4 transition-colors ${isWinner ? (gold ? "bg-accent/[0.12]" : "bg-primary/[0.14]") : ""}`}>
      {/* Barra de ganador */}
      {isWinner && (
        <span
          className={`absolute left-0 top-0 h-full w-[5px] ${gold ? "bg-accent shadow-[0_0_14px_hsl(var(--accent))]" : "bg-primary shadow-[0_0_14px_hsl(var(--primary))]"}`}
        />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-4">
        {team?.shieldUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.shieldUrl} alt={team.name} className="h-14 w-14 shrink-0 object-cover ring-2 ring-white/15 [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)]" />
        ) : (
          <div className={`grid h-14 w-14 shrink-0 place-items-center ring-2 [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)] ${team ? "bg-white/10 ring-white/15" : "bg-white/[0.04] ring-white/10"}`}>
            <span className="font-display text-2xl text-white/65">{team?.name?.charAt(0) ?? "?"}</span>
          </div>
        )}
        <span className={`truncate font-display text-3xl leading-none tracking-wide ${accentText}`}>
          {team?.name ?? "Por definir"}
        </span>
        {champion && isWinner && (
          <span className="flex shrink-0 items-center gap-1.5 bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-accent ring-1 ring-accent/45 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]">
            <Crown className="h-3.5 w-3.5" /> Campeón
          </span>
        )}
      </div>

      {/* Marcador */}
      {volleyLive ? (
        // Vóley en vivo: el PUNTO del set es protagonista; los sets ganados, un indicador chico.
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.15em] text-white/35">Sets</span>
            <span className="grid h-8 w-8 place-items-center bg-white/10 font-display text-xl tabular-nums text-white/80 ring-1 ring-white/10">
              {score}
            </span>
          </div>
          <span className="grid h-16 w-[4.5rem] place-items-center bg-green-500/15 font-display text-5xl tabular-nums text-green-300 ring-1 ring-green-400/40 [clip-path:polygon(0_0,100%_0,100%_84%,84%_100%,0_100%)]">
            {setPoints ?? 0}
          </span>
        </div>
      ) : (
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center font-display text-4xl tabular-nums [clip-path:polygon(0_0,100%_0,100%_82%,82%_100%,0_100%)] ${
            isWinner
              ? gold
                ? "bg-accent/25 text-accent ring-1 ring-accent/40"
                : "bg-primary/25 text-primary ring-1 ring-primary/40"
              : "bg-white/[0.06] text-white/65 ring-1 ring-white/10"
          }`}
        >
          {done ? score : "–"}
        </span>
      )}
    </div>
  );
}

function StatusBug({ live, done }: { live: boolean; done: boolean }) {
  if (live) {
    return (
      <span className="flex items-center gap-1.5 bg-green-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.15em] text-green-400 ring-1 ring-green-400/40 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> En vivo
      </span>
    );
  }
  if (done) {
    return <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/40">Finalizado</span>;
  }
  return <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/25">Programado</span>;
}

function MatchCard({
  match,
  title,
  variant,
  icon,
  delay,
}: {
  match: BracketMatchState | null;
  title: string;
  variant: Variant;
  icon?: React.ReactNode;
  delay: number;
}) {
  const done = match?.status === "finalizado";
  const live = match?.status === "en_curso";
  const w = winnersOf(match);
  const isFinal = variant === "final";
  const isVolleyLive = !!live && match?.currentSet != null;

  const frame =
    variant === "final"
      ? "ring-accent/40 bg-gradient-to-br from-accent/[0.08] via-transparent to-transparent shadow-[0_0_40px_-12px_hsl(var(--accent)/0.4)]"
      : variant === "third"
        ? "ring-orange-700/40 bg-white/[0.025]"
        : "ring-white/12 bg-white/[0.03]";

  return (
    <div
      className={`tv-anim-power relative overflow-hidden shadow-xl ring-1 [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)] ${frame} ${isFinal ? "tv-sweep" : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Encabezado angular del partido */}
      <div className={`relative flex items-center justify-between border-b px-5 py-2.5 ${isFinal ? "border-accent/25" : "border-white/10"}`}>
        <span className={`flex items-center gap-2 font-display tracking-[0.2em] ${isFinal ? "text-xl text-accent" : "text-lg text-white/65"}`}>
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-2.5">
          {isVolleyLive && (
            <span className="bg-green-500/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-green-300 ring-1 ring-green-400/30 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]">
              Set {match!.currentSet}
            </span>
          )}
          <StatusBug live={!!live} done={!!done} />
        </div>
      </div>

      <div className="relative divide-y divide-white/10">
        <TeamRow team={match?.homeTeam ?? null} score={match?.homeScore ?? 0} isWinner={w.home} done={!!done} champion={isFinal} variant={variant} volleyLive={isVolleyLive} setPoints={match?.currentSetHome ?? 0} />

        {/* Nodo VS sobre la línea divisoria */}
        <span className="absolute left-5 top-1/2 z-10 grid h-9 w-9 -translate-x-1.5 -translate-y-1/2 place-items-center bg-[#0a0e16] font-display text-sm tracking-widest text-white/55 ring-1 ring-white/15 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]">
          VS
        </span>

        <TeamRow team={match?.awayTeam ?? null} score={match?.awayScore ?? 0} isWinner={w.away} done={!!done} champion={isFinal} variant={variant} volleyLive={isVolleyLive} setPoints={match?.currentSetAway ?? 0} />
      </div>
    </div>
  );
}

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`h-7 w-2 ${accent} [clip-path:polygon(0_0,100%_0,100%_75%,60%_100%,0_100%)]`} />
      <h3 className="font-display text-2xl tracking-[0.22em] text-white/75">{children}</h3>
      <span className="ml-1 h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

function ChampionBanner({ final }: { final: BracketMatchState | null }) {
  const w = winnersOf(final);
  const champ = w.home ? final?.homeTeam : w.away ? final?.awayTeam : null;
  if (!champ) return null;
  return (
    <div className="tv-anim-power relative mb-2 flex items-center justify-center gap-4 overflow-hidden bg-gradient-to-r from-accent/15 via-accent/[0.08] to-accent/15 px-6 py-5 ring-1 ring-accent/40 [clip-path:polygon(0_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,14px_100%,0_calc(100%-14px))]">
      <div className="tv-sweep absolute inset-0" />
      <Trophy className="relative h-9 w-9 text-accent" />
      <div className="relative text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.45em] text-accent/70">Campeón</p>
        <p className="tv-gold-text font-display text-4xl leading-none tracking-wide">{champ.name}</p>
      </div>
      <Trophy className="relative h-9 w-9 text-accent" />
    </div>
  );
}

function BracketLayout({ state }: { state: BracketState }) {
  const semi1 = state.semifinals[0] ?? null;
  const semi2 = state.semifinals[1] ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-7">
      <ChampionBanner final={state.final} />

      {/* Semifinales */}
      <section>
        <SectionTitle accent="bg-primary">Semifinales</SectionTitle>
        <div className="flex flex-col gap-4">
          <MatchCard match={semi1} title="Semifinal 1" variant="semi" delay={0.1} />
          <MatchCard match={semi2} title="Semifinal 2" variant="semi" delay={0.18} />
        </div>
      </section>

      {/* Definición */}
      <section>
        <SectionTitle accent="bg-accent">Definición</SectionTitle>
        <div className="flex flex-col gap-4">
          {state.thirdPlace && (
            <MatchCard
              match={state.thirdPlace}
              title="Tercer puesto"
              variant="third"
              icon={<Medal className="h-5 w-5 text-orange-400" />}
              delay={0.26}
            />
          )}
          <MatchCard
            match={state.final}
            title="Final"
            variant="final"
            icon={<Trophy className="h-6 w-6 text-accent" />}
            delay={0.34}
          />
        </div>
      </section>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="tv-anim-rise flex h-full min-h-[420px] flex-col items-center justify-center gap-4 text-center text-white/45">
      {children}
    </div>
  );
}

function Standby({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: React.ReactNode }) {
  return (
    <Centered>
      <div className="grid h-20 w-20 place-items-center bg-white/[0.04] ring-1 ring-white/10 [clip-path:polygon(0_0,100%_0,100%_80%,80%_100%,0_100%)]">
        {icon}
      </div>
      <div>
        <p className="font-display text-3xl tracking-[0.18em] text-white/70">{title}</p>
        {sub && <p className="mt-2 text-sm text-white/40">{sub}</p>}
      </div>
    </Centered>
  );
}

export default function TvBracket({ championship }: { championship: ChampionshipLite | null }) {
  const isFunctional = championship ? FUNCTIONAL.has(championship.sport) : false;
  const { state, connected } = useBracketSocket(isFunctional ? championship!.id : null);

  if (!championship) {
    return <Standby icon={<Trophy className="h-9 w-9 text-white/30" />} title="Selecciona un campeonato" />;
  }

  if (championship.sport === "ajedrez") {
    return <Standby icon={<Trophy className="h-9 w-9 text-white/30" />} title="Llave no disponible" sub="El ajedrez no usa formato de llave" />;
  }


  // Fútbol: datos reales por WebSocket
  // Sin conexión al servidor de tiempo real (scores-backend apagado/no desplegado)
  if (!connected && !state) {
    return (
      <Standby
        icon={<WifiOff className="h-9 w-9 text-white/30" />}
        title="Sin señal en vivo"
        sub={<>Verifica que <span className="font-mono text-white/60">scores-backend</span> esté ejecutándose</>}
      />
    );
  }

  // Conectado pero aún sin el primer estado
  if (!state) {
    return <Centered><Loader2 className="h-8 w-8 animate-spin" /></Centered>;
  }

  const hasBracket = state.semifinals.length > 0 || state.final;
  if (!hasBracket) {
    return <Standby icon={<Trophy className="h-9 w-9 text-white/30" />} title="Llave por generar" sub="La llave aún no ha sido creada" />;
  }

  return (
    <div className="space-y-4">
      {/* Indicador de conexión en vivo */}
      <div className="flex justify-end">
        {connected ? (
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-400">
            <span className="tv-live-dot h-2 w-2 rounded-full bg-green-400" /> Señal en vivo
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <WifiOff className="h-3.5 w-3.5" /> Reconectando…
          </span>
        )}
      </div>
      <BracketLayout state={state} />
    </div>
  );
}
