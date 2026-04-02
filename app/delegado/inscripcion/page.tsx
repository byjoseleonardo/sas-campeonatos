"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Search, UserPlus, Trash2, CheckCircle2, AlertCircle, Clock, Loader2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlayerInscriptionForm from "@/components/admin/PlayerInscriptionForm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Championship {
  id: string;
  name: string;
  sport: string;
  location: string | null;
  titulares: number;
  suplentes: number;
  minSuplentes: number;
  maxInscripciones: number;
}

interface Team {
  id: string;
  name: string;
  championshipId: string;
  championship: Championship;
  _count: { rosterEntries: number };
}

interface RosterEntry {
  id: string;
  number: number;
  position: string;
  status: "pendiente" | "inscrito" | "rechazado";
  createdAt: string;
  player: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
  };
}

const statusConfig = {
  inscrito:  { label: "Inscrito",  icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  pendiente: { label: "Pendiente", icon: Clock,         className: "bg-accent/15 text-accent-foreground" },
  rechazado: { label: "Rechazado", icon: AlertCircle,   className: "bg-destructive/15 text-destructive" },
};

const sportLabels: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

const positionOptions = [
  "Portero", "Defensa Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista", "Mediocampista Defensivo", "Extremo", "Delantero Centro",
  "Líbero", "Armador", "Opuesto", "Punta", "Central",
];

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DelegadoInscripcionPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedChampId, setSelectedChampId] = useState<string>("");
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  // Dialog para registrar equipo nuevo
  const [registerOpen, setRegisterOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  // Cargar campeonatos disponibles
  useEffect(() => {
    fetch("/api/delegado/championships")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setChampionships(list);
        if (list.length > 0) setSelectedChampId(list[0].id);
      });
  }, []);

  // Cargar equipo del delegado cuando cambia el campeonato
  useEffect(() => {
    if (!selectedChampId) return;
    setLoading(true);
    fetch(`/api/delegado/team?championshipId=${selectedChampId}`)
      .then((r) => r.json())
      .then((d) => {
        setTeam(d ?? null);
        setLoading(false);
      });
  }, [selectedChampId]);

  // Cargar plantel cuando hay equipo
  const fetchRoster = useCallback(async () => {
    if (!team?.id) return;
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/delegado/team/${team.id}/roster`);
      const data = await res.json();
      setRoster(Array.isArray(data) ? data : []);
    } finally {
      setRosterLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  // Registrar equipo
  const handleRegisterTeam = async () => {
    if (!teamName.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/delegado/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim(), championshipId: selectedChampId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeam(data);
      setRegisterOpen(false);
      setTeamName("");
      toast({ title: "Equipo registrado", description: `"${data.name}" fue inscrito exitosamente.` });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al registrar", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  // Inscribir jugador
  const handleInscribir = async (player: {
    name: string; dni: string; number: number; position: string; photoUrl: string | null;
  }) => {
    if (!team?.id) return;
    const [firstName, ...rest] = player.name.split(" ");
    const lastName = rest.join(" ") || "—";
    try {
      const res = await fetch(`/api/delegado/team/${team.id}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: player.dni,
          firstName,
          lastName,
          number: player.number,
          position: player.position,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Jugador inscrito", description: `${player.name} fue registrado exitosamente.` });
      fetchRoster();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al inscribir", variant: "destructive" });
    }
  };

  // Eliminar jugador
  const handleDelete = async (entryId: string) => {
    if (!team?.id) return;
    try {
      const res = await fetch(`/api/delegado/team/${team.id}/roster/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast({ title: "Jugador eliminado" });
      fetchRoster();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al eliminar", variant: "destructive" });
    }
  };

  const selectedChamp = championships.find((c) => c.id === selectedChampId);
  const maxJugadores = team?.championship.maxInscripciones ?? selectedChamp?.maxInscripciones ?? 22;
  const minSuplentes = team?.championship.minSuplentes ?? selectedChamp?.minSuplentes ?? 5;
  const titulares = team?.championship.titulares ?? selectedChamp?.titulares ?? 11;
  const inscritos = roster.filter((r) => r.status === "inscrito").length;
  const pendientes = roster.filter((r) => r.status === "pendiente").length;
  const disponibles = maxJugadores - roster.length;

  // Progreso de planilla
  const suplentesActuales = Math.max(0, roster.length - titulares);
  const titularesCompletos = roster.length >= titulares;
  const suplentesCompletos = suplentesActuales >= minSuplentes;
  const planillaCompleta = titularesCompletos && suplentesCompletos;

  const filteredRoster = roster.filter((r) =>
    `${r.player.firstName} ${r.player.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    r.player.dni.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">INSCRIPCIÓN DE JUGADORES</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ingresa el DNI del jugador para consultar sus datos y registrarlo en tu equipo
        </p>
      </div>

      {/* Selector de campeonato */}
      <div className="space-y-2 max-w-sm">
        <Label className="text-xs text-muted-foreground">Campeonato</Label>
        <Select value={selectedChampId} onValueChange={(v) => { setSelectedChampId(v); setTeam(null); setRoster([]); }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar campeonato" /></SelectTrigger>
          <SelectContent>
            {championships.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} <span className="text-muted-foreground text-xs">— {sportLabels[c.sport] ?? c.sport}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sin campeonatos disponibles */}
      {championships.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No hay campeonatos en período de inscripciones</p>
            <p className="text-sm text-muted-foreground">El administrador debe abrir las inscripciones primero.</p>
          </CardContent>
        </Card>
      )}

      {/* Sin equipo registrado */}
      {selectedChampId && !loading && !team && championships.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Aún no tienes equipo en este campeonato</p>
              <p className="text-sm text-muted-foreground mt-1">Registra tu equipo para comenzar a inscribir jugadores</p>
            </div>
            <Button onClick={() => setRegisterOpen(true)}>Registrar mi equipo</Button>
          </CardContent>
        </Card>
      )}

      {/* Equipo registrado — mostrar plantel */}
      {team && (
        <>
          {/* Info del equipo */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-display text-lg text-primary">
              {team.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                {team.championship.name} · {sportLabels[team.championship.sport] ?? team.championship.sport}
                {team.championship.location && ` · ${team.championship.location}`}
              </p>
            </div>
          </div>

          {/* Banner de progreso de planilla */}
          <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${
            planillaCompleta
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-amber-400/30 bg-amber-400/5 text-amber-700 dark:text-amber-400"
          }`}>
            {planillaCompleta
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertCircle className="h-4 w-4 shrink-0" />
            }
            <div className="flex-1">
              {planillaCompleta ? (
                <span className="font-medium">Planilla completa — puedes enviarla para validación</span>
              ) : (
                <span>
                  {!titularesCompletos && (
                    <>Faltan <strong>{titulares - roster.length}</strong> titular{titulares - roster.length !== 1 ? "es" : ""} · </>
                  )}
                  {titularesCompletos && !suplentesCompletos && (
                    <>Faltan <strong>{minSuplentes - suplentesActuales}</strong> suplente{minSuplentes - suplentesActuales !== 1 ? "s" : ""} mínimos · </>
                  )}
                  Mínimo requerido: <strong>{titulares}</strong> titulares + <strong>{minSuplentes}</strong> suplentes
                </span>
              )}
            </div>
            <span className="text-xs font-mono opacity-60 shrink-0">{roster.length}/{maxJugadores}</span>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-display">{inscritos}</p>
                  <p className="text-[10px] text-muted-foreground">Inscritos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-accent/10">
                  <Clock className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xl font-display">{pendientes}</p>
                  <p className="text-[10px] text-muted-foreground">Pendientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-muted">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-display">{disponibles}</p>
                  <p className="text-[10px] text-muted-foreground">Disponibles</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search + Add */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o cédula..."
                className="max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <PlayerInscriptionForm
              teamName={team.name}
              championshipName={team.championship.name}
              playersCount={roster.length}
              maxPlayers={maxJugadores}
              positionOptions={positionOptions}
              onInscribir={handleInscribir}
            />
          </div>

          {/* Tabla de jugadores */}
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
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoster.map((entry) => {
                      const status = statusConfig[entry.status];
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-display text-lg text-muted-foreground">
                            {entry.number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-display text-sm shrink-0">
                                {entry.player.firstName.charAt(0)}
                              </div>
                              <p className="text-sm font-medium">
                                {entry.player.firstName} {entry.player.lastName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {entry.player.dni}
                          </TableCell>
                          <TableCell className="text-sm">{entry.position}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.status === "pendiente" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {!rosterLoading && filteredRoster.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No hay jugadores inscritos aún
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog: registrar equipo */}
      <Dialog open={registerOpen} onOpenChange={(v) => { setRegisterOpen(v); if (!v) setTeamName(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del equipo</Label>
              <Input
                placeholder="Ej: FC Esmeraldas"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegisterTeam()}
              />
            </div>
            {selectedChamp && (
              <p className="text-xs text-muted-foreground">
                Se inscribirá en: <span className="font-medium text-foreground">{selectedChamp.name}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleRegisterTeam} disabled={registering || !teamName.trim()}>
              {registering && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
