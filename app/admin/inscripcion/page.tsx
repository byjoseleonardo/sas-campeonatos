"use client";

import { useState } from "react";
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
import { Search, UserPlus, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { mockPlayers, type Player } from "@/lib/adminMockData";
import { championships, teams } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import PlayerInscriptionForm from "@/components/admin/PlayerInscriptionForm";

const positionOptions = [
  "Portero", "Defensa", "Mediocampista", "Delantero",
  "Líbero", "Central", "Armador", "Opuesto", "Punta",
];

const statusConfig: Record<Player["status"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  inscrito: { label: "Inscrito", icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  pendiente: { label: "Pendiente", icon: Clock, className: "bg-accent/15 text-accent-foreground" },
  rechazado: { label: "Rechazado", icon: AlertCircle, className: "bg-destructive/15 text-destructive" },
};

export default function AdminDelegadoInscripcionPage() {
  const [search, setSearch] = useState("");
  const [selectedChampionship, setSelectedChampionship] = useState("1");
  const [selectedTeam, setSelectedTeam] = useState("1");
  const [localPlayers, setLocalPlayers] = useState(mockPlayers);
  const { toast } = useToast();

  const filteredTeams = teams.filter((t) => t.championshipId === selectedChampionship);

  const players = localPlayers.filter(
    (p) => p.teamId === selectedTeam && p.championshipId === selectedChampionship
  );

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cedula.includes(search)
  );

  const selectedChamp = championships.find((c) => c.id === selectedChampionship);
  const selectedTeamData = teams.find((t) => t.id === selectedTeam);

  const inscritos = players.filter((p) => p.status === "inscrito").length;
  const pendientes = players.filter((p) => p.status === "pendiente").length;
  const maxJugadores = 22;

  const handleInscribir = (player: {
    firstName: string;
    paternalLastName: string;
    maternalLastName?: string | null;
    dni: string;
    number: number;
    position: string;
    photoUrl: string | null;
  }) => {
    const fullName = [player.firstName, player.paternalLastName, player.maternalLastName].filter(Boolean).join(" ");
    const newPlayer: Player = {
      id: `p${Date.now()}`,
      name: fullName,
      cedula: player.dni,
      position: player.position,
      number: player.number,
      teamId: selectedTeam,
      teamName: selectedTeamData?.name || "",
      championshipId: selectedChampionship,
      photoUrl: player.photoUrl || "",
      status: "pendiente",
      createdAt: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setLocalPlayers((prev) => [...prev, newPlayer]);
    toast({
      title: "Jugador inscrito",
      description: `${fullName} ha sido registrado exitosamente.`,
    });
  };

  const handleDelete = (playerId: string) => {
    setLocalPlayers((prev) => prev.filter((p) => p.id !== playerId));
    toast({ title: "Jugador eliminado", description: "El jugador ha sido removido de la lista." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">INSCRIPCIÓN DE JUGADORES</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ingresa el DNI del jugador para consultar sus datos y registrarlo en tu equipo
        </p>
      </div>

      {/* Championship & Team selector */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Campeonato</Label>
          <Select
            value={selectedChampionship}
            onValueChange={(v) => {
              setSelectedChampionship(v);
              setSelectedTeam(teams.filter((t) => t.championshipId === v)[0]?.id || "");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {championships.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Equipo</Label>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {filteredTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <p className="text-xl font-display">{maxJugadores - players.length}</p>
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
          teamName={selectedTeamData?.name || ""}
          championshipName={selectedChamp?.name || ""}
          playersCount={players.length}
          maxPlayers={maxJugadores}
          positionOptions={positionOptions}
          onInscribir={handleInscribir}
        />
      </div>

      {/* Player table */}
      <Card>
        <CardContent className="p-0">
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
              {filteredPlayers.map((p) => {
                const status = statusConfig[p.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-display text-lg text-muted-foreground">
                      {p.number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-display text-sm shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.createdAt}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {p.cedula}
                    </TableCell>
                    <TableCell className="text-sm">{p.position}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredPlayers.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No hay jugadores inscritos en este equipo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
