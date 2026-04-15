import { prisma } from "@/lib/prisma";
import { Users, Trophy } from "lucide-react";

const sportLabel: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    where: {
      status: "activo",
      championship: { status: { not: "borrador" } },
    },
    select: {
      id:       true,
      name:     true,
      shieldUrl: true,
      championship: { select: { id: true, name: true, slug: true, sport: true } },
      _count: { select: { rosterEntries: { where: { status: "inscrito" } } } },
    },
    orderBy: [{ championship: { name: "asc" } }, { name: "asc" }],
  });

  // Agrupar por campeonato
  const byChamp: Record<string, { champName: string; champSlug: string; sport: string; teams: typeof teams }> = {};
  for (const t of teams) {
    const key = t.championship.id;
    if (!byChamp[key]) {
      byChamp[key] = {
        champName: t.championship.name,
        champSlug: t.championship.slug,
        sport:     t.championship.sport,
        teams:     [],
      };
    }
    byChamp[key].teams.push(t);
  }

  return (
    <div className="container py-12">
      <h1 className="font-display text-5xl text-foreground">EQUIPOS</h1>
      <p className="mt-2 text-muted-foreground">
        Equipos inscritos en los campeonatos — {teams.length} en total
      </p>

      {teams.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No hay equipos inscritos aún.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {Object.entries(byChamp).map(([champId, { champName, champSlug, sport, teams: champTeams }]) => (
            <div key={champId}>
              {/* Cabecera del campeonato */}
              <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <Trophy className="h-4 w-4 text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {champName}
                </h2>
                <span className="text-xs text-muted-foreground/60">· {sportLabel[sport] ?? sport}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {champTeams.map((team) => (
                  <div
                    key={team.id}
                    className="group rounded-lg border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {team.shieldUrl ? (
                        <img
                          src={team.shieldUrl}
                          alt={team.name}
                          className="h-12 w-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h3 className="font-display text-lg text-card-foreground group-hover:text-primary transition-colors leading-tight">
                        {team.name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {team._count.rosterEntries} {team._count.rosterEntries === 1 ? "jugador" : "jugadores"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
