import { teams } from "@/lib/mockData";
import { Users, Trophy } from "lucide-react";

export default function TeamsPage() {
  return (
    <div className="container py-12">
      <h1 className="font-display text-5xl text-foreground">EQUIPOS</h1>
      <p className="mt-2 text-muted-foreground">Equipos inscritos en los campeonatos</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="group rounded-lg border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl text-card-foreground group-hover:text-primary transition-colors">
              {team.name}
            </h3>
            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" /> {team.championship}
              </p>
              <p>{team.players} jugadores · {team.sport}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
