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

  const selected = championships.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Glows decorativos de marca */}
      <div className="pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none tracking-tight">Llaves del Campeonato</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/40">En vivo · Pantalla</p>
          </div>
        </div>
        {selected && (
          <div className="text-right">
            <p className="text-lg font-bold tracking-tight">{selected.name}</p>
            <p className="text-sm font-medium text-primary">{sportLabel[selected.sport] ?? selected.sport}</p>
          </div>
        )}
      </header>

      <div className="relative z-10 flex flex-1 gap-6 p-6 lg:p-8">
        {/* Izquierda: campeonatos */}
        <aside className="flex w-72 shrink-0 flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : championships.length === 0 ? (
            <p className="text-sm text-white/40">No hay campeonatos con llaves.</p>
          ) : (
            championships.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/15 ring-1 ring-primary/40 shadow-lg shadow-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt={c.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 shrink-0">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${active ? "text-white" : "text-white/80"}`}>
                      {c.name}
                    </p>
                    <p className="text-xs text-white/40">{sportLabel[c.sport] ?? c.sport}</p>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Derecha: llave */}
        <main className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-6 lg:p-8 ring-1 ring-white/5">
          <TvBracket championship={selected} />
        </main>
      </div>
    </div>
  );
}
