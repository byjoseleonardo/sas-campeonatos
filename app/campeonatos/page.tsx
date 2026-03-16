"use client";

import ChampionshipCard from "@/components/ChampionshipCard";
import { championships } from "@/lib/mockData";
import { useState } from "react";

const statusFilters = ["todos", "activo", "inscripciones", "finalizado"] as const;

export default function ChampionshipsPage() {
  const [filter, setFilter] = useState<string>("todos");

  const filtered = filter === "todos" ? championships : championships.filter((c) => c.status === filter);

  return (
    <div className="container py-12">
      <h1 className="font-display text-5xl text-foreground">CAMPEONATOS</h1>
      <p className="mt-2 text-muted-foreground">Explora todos los torneos disponibles</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "todos" ? "Todos" : s === "activo" ? "En curso" : s === "inscripciones" ? "Inscripciones" : "Finalizados"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <ChampionshipCard key={c.id} {...c} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">No hay campeonatos en esta categoría.</p>
      )}
    </div>
  );
}
