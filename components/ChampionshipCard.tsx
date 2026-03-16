import Link from "next/link";
import { Calendar, Users, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChampionshipCardProps {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: "activo" | "finalizado" | "inscripciones";
  teams: number;
  date: string;
  location: string;
}

const statusStyles: Record<string, string> = {
  activo: "bg-primary/15 text-primary border-primary/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  inscripciones: "bg-accent/15 text-accent-foreground border-accent/30",
};

const ChampionshipCard = ({ id, name, sport, format, status, teams, date, location }: ChampionshipCardProps) => {
  return (
    <Link
      href={`/campeonatos/${id}`}
      className="group block rounded-lg border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
    >
      <div className="flex items-start justify-between">
        <Badge variant="outline" className={statusStyles[status]}>
          {status === "activo" ? "En curso" : status === "finalizado" ? "Finalizado" : "Inscripciones abiertas"}
        </Badge>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{sport}</span>
      </div>
      <h3 className="mt-3 font-display text-2xl text-card-foreground group-hover:text-primary transition-colors">
        {name}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{format}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{date}</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{teams} equipos</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location}</span>
      </div>
    </Link>
  );
};

export default ChampionshipCard;
