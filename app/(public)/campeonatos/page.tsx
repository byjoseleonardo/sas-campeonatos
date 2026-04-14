"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Calendar, Users, Trophy } from "lucide-react";

interface Championship {
  id: string;
  name: string;
  slug: string;
  sport: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  format: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  maxEquipos: number;
  _count: { teams: number };
}

const statusFilters = ["todos", "en_curso", "inscripciones", "finalizado"] as const;

const statusLabel: Record<string, string> = {
  inscripciones: "Inscripciones",
  en_curso:      "En curso",
  finalizado:    "Finalizado",
};

const statusBadge: Record<string, string> = {
  inscripciones: "bg-accent/15 text-accent-foreground border-accent/30",
  en_curso:      "bg-primary/15 text-primary border-primary/30",
  finalizado:    "bg-muted text-muted-foreground border-border",
};

const sportLabel: Record<string, string> = {
  futbol:     "Fútbol",
  futsal:     "Futsal",
  baloncesto: "Baloncesto",
  voleibol:   "Voleibol",
};

const formatLabel: Record<string, string> = {
  liga:                 "Liga",
  eliminacion:          "Eliminación directa",
  grupos_eliminacion:   "Grupos + Eliminación",
  personalizado:        "Personalizado",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ChampionshipsPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("todos");

  useEffect(() => {
    fetch("/api/public/championships")
      .then((r) => r.json())
      .then((d) => setChampionships(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "todos"
    ? championships
    : championships.filter((c) => c.status === filter);

  return (
    <div className="container py-12">
      <h1 className="font-display text-5xl text-foreground">CAMPEONATOS</h1>
      <p className="mt-2 text-muted-foreground">Explora todos los torneos disponibles</p>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "todos" ? "Todos" : statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No hay campeonatos en esta categoría.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/campeonatos/${c.slug || c.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                {/* Banner / logo */}
                <div className="h-32 rounded-t-lg bg-muted flex items-center justify-center overflow-hidden">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-xl leading-tight group-hover:text-primary transition-colors">
                      {c.name}
                    </h2>
                    <Badge variant="outline" className={`shrink-0 text-xs ${statusBadge[c.status]}`}>
                      {statusLabel[c.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{sportLabel[c.sport] ?? c.sport}</span>
                    <span>·</span>
                    <span>{formatLabel[c.format] ?? c.format}</span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {c.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {c.location}
                      </p>
                    )}
                    {c.startDate && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(c.startDate)}
                        {c.endDate ? ` — ${formatDate(c.endDate)}` : ""}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0" />
                      {c._count.teams} {c._count.teams === 1 ? "equipo" : "equipos"}
                      {c.maxEquipos > 0 ? ` / ${c.maxEquipos}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
