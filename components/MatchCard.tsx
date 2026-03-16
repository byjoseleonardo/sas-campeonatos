import { Clock } from "lucide-react";

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  championship: string;
  status: "programado" | "en_vivo" | "finalizado";
}

const MatchCard = ({ homeTeam, awayTeam, homeScore, awayScore, date, time, championship, status }: MatchCardProps) => {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>{championship}</span>
        {status === "en_vivo" && (
          <span className="flex items-center gap-1 text-primary font-semibold">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            EN VIVO
          </span>
        )}
        {status === "programado" && (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
        )}
        {status === "finalizado" && <span>Finalizado</span>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-semibold text-sm ${status === "finalizado" && homeScore !== undefined && awayScore !== undefined && homeScore > awayScore ? "text-primary" : "text-card-foreground"}`}>
            {homeTeam}
          </p>
        </div>
        <div className="mx-4 flex items-center gap-2 font-display text-2xl text-card-foreground">
          <span>{homeScore ?? "-"}</span>
          <span className="text-muted-foreground text-base">:</span>
          <span>{awayScore ?? "-"}</span>
        </div>
        <div className="flex-1 text-right">
          <p className={`font-semibold text-sm ${status === "finalizado" && homeScore !== undefined && awayScore !== undefined && awayScore > homeScore ? "text-primary" : "text-card-foreground"}`}>
            {awayTeam}
          </p>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">{date}</p>
    </div>
  );
};

export default MatchCard;
