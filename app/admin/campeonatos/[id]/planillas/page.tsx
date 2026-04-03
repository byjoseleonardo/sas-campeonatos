"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Trash2, Loader2, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Player {
  dni: string;
  firstName: string;
  lastName: string;
}

interface RosterEntry {
  id: string;
  number: number;
  position: string;
  status: "inscrito" | "pendiente" | "rechazado";
  player: Player;
}

interface Team {
  id: string;
  name: string;
  status: string;
  rosterEntries: RosterEntry[];
}

interface Championship {
  id: string;
  name: string;
  status: string;
}

const rosterStatusConfig = {
  inscrito:  { label: "Inscrito",  className: "bg-primary/15 text-primary" },
  pendiente: { label: "Pendiente", className: "bg-accent/15 text-accent-foreground" },
  rechazado: { label: "Rechazado", className: "bg-destructive/15 text-destructive" },
};

const canEdit = (status: string) => status !== "en_curso" && status !== "finalizado";

export default function PlanillasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ teamId: string; entryId: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [champRes, teamsRes] = await Promise.all([
        fetch(`/api/championships/${id}`),
        fetch(`/api/championships/${id}/teams`),
      ]);
      const champData = await champRes.json();
      const teamsData = await teamsRes.json();
      setChampionship(champData);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la información", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/championships/${id}/teams/${deleteTarget.teamId}/roster/${deleteTarget.entryId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Jugador eliminado", description: `${deleteTarget.name} fue removido de la planilla.` });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al eliminar", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const editable = championship ? canEdit(championship.status) : false;
  const totalJugadores = teams.reduce((acc, t) => acc + t.rosterEntries.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/campeonatos"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="font-display text-4xl text-foreground">PLANILLAS</h1>
          {championship && (
            <p className="text-muted-foreground text-sm mt-1">{championship.name}</p>
          )}
        </div>
      </div>

      {!editable && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          El campeonato está en curso o finalizado — no se pueden eliminar jugadores.
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display">{teams.length}</p>
              <p className="text-[10px] text-muted-foreground">Equipos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-accent/10">
              <Users className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xl font-display">{totalJugadores}</p>
              <p className="text-[10px] text-muted-foreground">Jugadores inscritos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay equipos inscritos en este campeonato</p>
          </CardContent>
        </Card>
      ) : (
        teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm text-primary">
                    {team.name.charAt(0)}
                  </div>
                  <span className="font-display text-lg">{team.name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {team.rosterEntries.length} jugador{team.rosterEntries.length !== 1 ? "es" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {team.rosterEntries.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">Sin jugadores inscritos</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead>Estado</TableHead>
                      {editable && <TableHead className="text-right">Acción</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.rosterEntries.map((entry) => {
                      const sc = rosterStatusConfig[entry.status] ?? rosterStatusConfig.pendiente;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-display text-lg text-muted-foreground">{entry.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm shrink-0">
                                {entry.player.firstName.charAt(0)}
                              </div>
                              <p className="text-sm font-medium">{entry.player.firstName} {entry.player.lastName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{entry.player.dni}</TableCell>
                          <TableCell className="text-sm">{entry.position}</TableCell>
                          <TableCell>
                            <Badge className={`${sc.className} border-0`}>{sc.label}</Badge>
                          </TableCell>
                          {editable && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget({
                                  teamId: team.id,
                                  entryId: entry.id,
                                  name: `${entry.player.firstName} ${entry.player.lastName}`,
                                })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar jugador de la planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleteTarget?.name}</strong> del equipo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
