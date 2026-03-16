"use client";

import MatchCard from "@/components/MatchCard";
import { matches } from "@/lib/mockData";
import { useState } from "react";

const statusFilters = ["todos", "en_vivo", "programado", "finalizado"] as const;

export default function MatchesPage() {
  const [filter, setFilter] = useState<string>("todos");

  const filtered = filter === "todos" ? matches : matches.filter((m) => m.status === filter);

  return (
    <div className="container py-12">
      <h1 className="font-display text-5xl text-foreground">PARTIDOS</h1>
      <p className="mt-2 text-muted-foreground">Calendario y resultados de los encuentros</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "todos" ? "Todos" : s === "en_vivo" ? "En Vivo" : s === "programado" ? "Programados" : "Finalizados"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.map((m, i) => (
          <MatchCard key={i} {...m} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">No hay partidos en esta categoría.</p>
      )}
    </div>
  );
}
