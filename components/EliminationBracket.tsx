import type { BracketMatch } from "@/lib/mockData";

const EliminationBracket = ({ matches }: { matches: BracketMatch[] }) => {
  const rounds = [...new Set(matches.map((m) => m.round))];

  return (
    <div className="mt-4 overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max items-start">
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[220px]">
              <h3 className="font-display text-lg text-foreground text-center mb-2">{round}</h3>
              <div className="flex flex-col gap-6 justify-around flex-1">
                {roundMatches.map((m) => {
                  const homeWin = m.status === "finalizado" && m.homeScore !== undefined && m.awayScore !== undefined && m.homeScore > m.awayScore;
                  const awayWin = m.status === "finalizado" && m.homeScore !== undefined && m.awayScore !== undefined && m.awayScore > m.homeScore;
                  return (
                    <div key={m.id} className="rounded-lg border bg-card shadow-card overflow-hidden">
                      <div className={`flex items-center justify-between px-3 py-2 border-b ${homeWin ? "bg-primary/5" : ""}`}>
                        <span className={`text-sm font-medium ${homeWin ? "text-primary" : "text-card-foreground"}`}>
                          {m.homeTeam ?? "Por definir"}
                        </span>
                        <span className={`font-display text-lg ${homeWin ? "text-primary" : "text-muted-foreground"}`}>
                          {m.homeScore ?? "-"}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between px-3 py-2 ${awayWin ? "bg-primary/5" : ""}`}>
                        <span className={`text-sm font-medium ${awayWin ? "text-primary" : "text-card-foreground"}`}>
                          {m.awayTeam ?? "Por definir"}
                        </span>
                        <span className={`font-display text-lg ${awayWin ? "text-primary" : "text-muted-foreground"}`}>
                          {m.awayScore ?? "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EliminationBracket;
