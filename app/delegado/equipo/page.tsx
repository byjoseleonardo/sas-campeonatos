"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Shield, Users, Trophy, MapPin, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const sportLabels: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

const statusLabels: Record<string, string> = {
  activo: "Activo", descalificado: "Descalificado", retirado: "Retirado",
};

const rosterStatusConfig: Record<string, { label: string; className: string }> = {
  inscrito:  { label: "Inscrito",  className: "bg-primary/15 text-primary" },
  pendiente: { label: "Pendiente", className: "bg-accent/15 text-accent-foreground" },
  rechazado: { label: "Rechazado", className: "bg-destructive/15 text-destructive" },
};

interface Team {
  id: string;
  name: string;
  status: string;
  championship: {
    name: string;
    sport: string;
    location: string | null;
    startDate: string | null;
    titulares: number;
    suplentes: number;
    maxInscripciones: number;
  };
  _count: { rosterEntries: number };
}

interface RosterEntry {
  id: string;
  number: number;
  position: string;
  status: string;
  player: {
    dni: string;
    firstName: string;
    lastName: string;
  };
}

export default function DelegadoEquipoPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    fetch("/api/delegado/team")
      .then((r) => r.json())
      .then((d) => {
        setTeam(d ?? null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!team?.id) return;
    setRosterLoading(true);
    fetch(`/api/delegado/team/${team.id}/roster`)
      .then((r) => r.json())
      .then((d) => { setRoster(Array.isArray(d) ? d : []); setRosterLoading(false); });
  }, [team?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl text-foreground">MI EQUIPO</h1>
          <p className="text-muted-foreground text-sm mt-1">Información general de tu equipo inscrito</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No tienes equipo registrado aún</p>
            <p className="text-sm text-muted-foreground">Ve a Inscripción para registrar tu equipo en un campeonato.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxPlayers = team.championship.maxInscripciones;
  const inscritos = roster.filter((r) => r.status === "inscrito").length;
  const titulares = team.championship.titulares;
  const planillaCompleta = inscritos >= titulares;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">MI EQUIPO</h1>
        <p className="text-muted-foreground text-sm mt-1">Información general de tu equipo inscrito</p>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-secondary to-secondary/80 flex items-end p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-primary-foreground">{team.name}</h2>
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-0">
                {statusLabels[team.status] ?? team.status}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campeonato</p>
                <p className="text-sm font-medium">{team.championship.name}</p>
                <p className="text-xs text-muted-foreground">{sportLabels[team.championship.sport] ?? team.championship.sport}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-accent/10">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jugadores</p>
                <p className="text-sm font-medium">{team._count.rosterEntries} / {maxPlayers}</p>
                <p className="text-xs text-muted-foreground">{team.championship.titulares} titulares · {team.championship.suplentes} suplentes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sede</p>
                <p className="text-sm font-medium">{team.championship.location ?? "—"}</p>
              </div>
            </div>
            {team.championship.startDate && (
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-sm font-medium">
                    {new Date(team.championship.startDate).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banner de progreso */}
      <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${
        planillaCompleta
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-amber-400/30 bg-amber-400/5 text-amber-700 dark:text-amber-400"
      }`}>
        {planillaCompleta
          ? <CheckCircle2 className="h-4 w-4 shrink-0" />
          : <AlertCircle className="h-4 w-4 shrink-0" />
        }
        <span className="flex-1">
          {planillaCompleta
            ? <span className="font-medium">Planilla completa</span>
            : <>Faltan <strong>{titulares - inscritos}</strong> jugadores para completar los titulares</>
          }
        </span>
        <span className="text-xs font-mono opacity-60 shrink-0">{inscritos}/{maxPlayers}</span>
      </div>

      {/* Lista de jugadores */}
      <Card>
        <CardContent className="p-0">
          {rosterLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((entry) => {
                  const sc = rosterStatusConfig[entry.status] ?? rosterStatusConfig.pendiente;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-display text-lg text-muted-foreground">{entry.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm shrink-0">
                            {entry.player.firstName.charAt(0)}
                          </div>
                          <p className="text-sm font-medium">{entry.player.firstName} {entry.player.lastName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{entry.player.dni}</TableCell>
                      <TableCell className="text-sm">{entry.position}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                          {sc.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!rosterLoading && roster.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No hay jugadores inscritos aún. Ve a Inscripción para agregarlos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
