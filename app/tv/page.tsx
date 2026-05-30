"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import TvBracket from "@/components/tv/TvBracket";

interface Championship {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  status: string;
}

const sportLabel: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Vóley", ajedrez: "Ajedrez",
};

// Solo deportes con formato de llave (fútbol funcional, vóley maqueta)
const BRACKET_SPORTS = new Set(["futbol", "futsal", "voleibol"]);

export default function TvPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/championships")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Championship[]) => {
        const filtered = data.filter((c) => BRACKET_SPORTS.has(c.sport));
        setChampionships(filtered);
        if (filtered.length > 0) setSelectedId(filtered[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  // Reloj de transmisión (se monta en cliente para evitar mismatch de hidratación)
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const selected = championships.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="tv-grain relative flex min-h-screen flex-col overflow-hidden bg-[#05070d]">
      {/* ── Atmósfera de estadio: reflectores, cancha, viñeta ── */}
      <div className="tv-bloom pointer-events-none absolute -left-40 -top-56 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[140px]" />
      <div className="tv-bloom pointer-events-none absolute -right-44 -top-52 h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-[140px]" style={{ animationDelay: "2.5s" }} />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-sky-400/[0.05] blur-[160px]" />
      <div className="tv-pitch pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      <div className="tv-scanline" />

      {/* ── Header / lower-third de transmisión ── */}
      <header className="tv-anim-rise relative z-20 flex flex-wrap items-end justify-between gap-4 px-4 pb-5 pt-6 sm:px-6 lg:px-10">
        {/* Marca */}
        <div className="flex items-center gap-4">
          <div className="relative grid h-14 w-14 place-items-center bg-primary/15 ring-1 ring-primary/40 [clip-path:polygon(0_0,100%_0,100%_72%,72%_100%,0_100%)]">
            <Trophy className="h-7 w-7 text-primary" />
            <span className="absolute inset-0 ring-1 ring-inset ring-white/5" />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-[0.85] tracking-wide text-white lg:text-5xl">
              Llaves del <span className="text-primary">Campeonato</span>
            </h1>
            <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-white/45">
              Transmisión · Marcador en vivo
            </p>
          </div>
        </div>

        {/* Estado de aire + campeonato en pantalla */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-3">
            {clock && (
              <span className="font-display text-xl tracking-widest text-white/55 tabular-nums">{clock}</span>
            )}
            <span className="flex items-center gap-2 bg-red-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-red-500/30 [clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]">
              <span className="tv-live-dot h-2 w-2 rounded-full bg-white" />
              On Air
            </span>
          </div>
          {selected && (
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-display text-2xl leading-none tracking-wide text-white">{selected.name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-accent">
                  {sportLabel[selected.sport] ?? selected.sport}
                </p>
              </div>
              {selected.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.logoUrl} alt={selected.name} className="h-12 w-12 object-cover ring-1 ring-white/20 [clip-path:polygon(0_0,100%_0,100%_72%,72%_100%,0_100%)]" />
              ) : null}
            </div>
          )}
        </div>
      </header>

      {/* Franja angular bajo el header */}
      <div className="relative z-20 mx-6 h-[3px] bg-gradient-to-r from-primary via-primary/30 to-accent lg:mx-10" />

      <div className="relative z-10 flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:p-8">
        {/* ── Izquierda: canales / campeonatos ── */}
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
          <div className="mb-1 flex items-center gap-2.5 px-1">
            <span className="h-4 w-1.5 bg-primary" />
            <span className="font-display text-base tracking-[0.35em] text-white/55">CAMPEONATOS</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : championships.length === 0 ? (
            <p className="px-1 text-sm text-white/40">No hay campeonatos con llaves.</p>
          ) : (
            championships.map((c, i) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{ animationDelay: `${0.12 + i * 0.07}s` }}
                  className={`tv-anim-left group relative flex items-center gap-3 overflow-hidden p-4 pl-5 text-left transition-all duration-300 [clip-path:polygon(0_0,100%_0,100%_100%,16px_100%)] ${
                    active
                      ? "bg-primary/[0.16] ring-1 ring-primary/50"
                      : "bg-white/[0.03] ring-1 ring-white/10 hover:bg-white/[0.06] hover:ring-white/25"
                  }`}
                >
                  {/* barra-equipo lateral */}
                  <span
                    className={`absolute left-0 top-0 h-full w-1.5 transition-colors ${
                      active ? "bg-primary shadow-[0_0_14px_hsl(var(--primary))]" : "bg-white/15 group-hover:bg-white/30"
                    }`}
                  />
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt={c.name} className="h-11 w-11 shrink-0 object-cover ring-1 ring-white/15 [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)]" />
                  ) : (
                    <div className="grid h-11 w-11 shrink-0 place-items-center bg-white/10 ring-1 ring-white/15 [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)]">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-display text-lg leading-tight tracking-wide ${active ? "text-white" : "text-white/80"}`}>
                      {c.name}
                    </p>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                      {sportLabel[c.sport] ?? c.sport}
                    </p>
                  </div>
                  {active && (
                    <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-primary">
                      ● En pantalla
                    </span>
                  )}
                </button>
              );
            })
          )}
        </aside>

        {/* ── Derecha: llave ── */}
        <main className="tv-anim-rise relative flex-1 overflow-y-auto bg-black/30 p-6 ring-1 ring-white/10 [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,0_24px)] lg:p-8" style={{ animationDelay: "0.18s" }}>
          {/* Círculo central de cancha, detrás de la llave */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.04]" />
          <div className="relative z-10">
            <TvBracket championship={selected} />
          </div>
        </main>
      </div>
    </div>
  );
}
