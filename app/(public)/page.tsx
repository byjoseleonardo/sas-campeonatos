import HeroSection from "@/components/HeroSection";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Users, Trophy, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

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

const matchStatusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_curso:   "bg-primary/15 text-primary",
  finalizado: "bg-green-500/15 text-green-700",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

const sportLabel: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

function formatDate(iso: Date | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: Date | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default async function Home() {
  // Campeonatos destacados: en_curso primero, luego inscripciones, máx 3
  const championships = await prisma.championship.findMany({
    where: { status: { not: "borrador" } },
    select: {
      id: true, name: true, slug: true, sport: true, format: true,
      status: true, startDate: true, endDate: true, location: true,
      logoUrl: true, maxEquipos: true,
      _count: { select: { teams: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 3,
  });

  // Últimos partidos: en_curso primero, luego los más recientes finalizados/programados
  const matches = await prisma.match.findMany({
    where: { status: { not: "postergado" } },
    include: {
      homeTeam:     { select: { id: true, name: true } },
      awayTeam:     { select: { id: true, name: true } },
      championship: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
    take: 4,
  });

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Campeonatos destacados */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-4xl text-foreground">CAMPEONATOS DESTACADOS</h2>
            <p className="mt-1 text-sm text-muted-foreground">Los torneos más recientes de la plataforma</p>
          </div>
          <Link href="/campeonatos" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {championships.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay campeonatos disponibles aún.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {championships.map((c) => (
              <Link
                key={c.id}
                href={`/campeonatos/${c.slug || c.id}`}
                className="group block rounded-lg border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className={`text-xs ${statusBadge[c.status]}`}>
                    {statusLabel[c.status]}
                  </Badge>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {sportLabel[c.sport] ?? c.sport}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl text-card-foreground group-hover:text-primary transition-colors">
                  {c.name}
                </h3>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {c.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(c.startDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c._count.teams}{c.maxEquipos > 0 ? ` / ${c.maxEquipos}` : ""} equipos
                  </span>
                  {c.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {c.location}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Últimos partidos */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-4xl text-foreground">ÚLTIMOS PARTIDOS</h2>
              <p className="mt-1 text-sm text-muted-foreground">Resultados y próximos encuentros</p>
            </div>
            <Link href="/partidos" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {matches.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay partidos disponibles aún.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {matches.map((m) => {
                const dt = formatDateTime(m.scheduledAt);
                const isLive = m.status === "en_curso";
                const isDone = m.status === "finalizado";
                return (
                  <Link key={m.id} href={`/partidos/${m.id}/live`}>
                    <div className={`rounded-lg border bg-card p-4 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer ${isLive ? "ring-2 ring-primary/30" : ""}`}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span className="truncate">{m.championship.name}</span>
                        {isLive && (
                          <span className="flex items-center gap-1 text-primary font-semibold shrink-0 ml-2">
                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            EN VIVO
                          </span>
                        )}
                        {!isLive && (
                          <Badge className={`text-[10px] border-0 shrink-0 ml-2 ${matchStatusBadge[m.status]}`}>
                            {m.status === "programado" && dt
                              ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dt.time}</span>
                              : m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`flex-1 font-semibold text-sm truncate ${isDone && m.homeScore > m.awayScore ? "text-primary" : "text-card-foreground"}`}>
                          {m.homeTeam?.name ?? "Por definir"}
                        </p>
                        <div className="mx-3 flex items-center gap-1.5 font-display text-2xl text-card-foreground shrink-0">
                          <span>{isDone || isLive ? m.homeScore : "—"}</span>
                          <span className="text-muted-foreground text-base">:</span>
                          <span>{isDone || isLive ? m.awayScore : "—"}</span>
                        </div>
                        <p className={`flex-1 font-semibold text-sm text-right truncate ${isDone && m.awayScore > m.homeScore ? "text-primary" : "text-card-foreground"}`}>
                          {m.awayTeam?.name ?? "Por definir"}
                        </p>
                      </div>

                      {dt && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">{dt.date}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
