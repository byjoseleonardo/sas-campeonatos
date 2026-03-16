"use client";

import { useState } from "react";
import MatchCard from "@/components/MatchCard";

interface Match {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  championship: string;
  status: "programado" | "en_vivo" | "finalizado";
  jornada: number;
}

const FixtureByJornada = ({ matches }: { matches: Match[] }) => {
  const jornadas = [...new Set(matches.map((m) => m.jornada))].sort((a, b) => a - b);
  const [activeJornada, setActiveJornada] = useState(jornadas[0] ?? 1);

  const filtered = matches.filter((m) => m.jornada === activeJornada);

  if (jornadas.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No hay partidos programados aún.</p>;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 mb-6">
        {jornadas.map((j) => (
          <button
            key={j}
            onClick={() => setActiveJornada(j)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeJornada === j
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Jornada {j}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((m, i) => (
          <MatchCard key={i} {...m} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">No hay partidos en esta jornada.</p>
      )}
    </div>
  );
};

export default FixtureByJornada;
