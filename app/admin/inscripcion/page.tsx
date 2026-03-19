"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, UserPlus, Trash2, Camera, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { mockPlayers, type Player } from "@/lib/adminMockData";
import { championships, teams } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredTeams = teams.filter((t) => t.championshipId === selectedChampionship);

  const players = mockPlayers.filter(
    (p) => p.teamId === selectedTeam && p.championshipId === selectedChampionship
  );

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cedula.includes(search)
  );

  const selectedChamp = championships.find((c) => c.id === selectedChampionship);
  const selectedTeamData = teams.find((t) => t.id === selectedTeam);

  const handlePhotoCapture = () => {
    setPhotoPreview("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxMiI+Rm90bzwvdGV4dD48L3N2Zz4=");
    toast({ title: "Foto capturada", description: "La foto del jugador ha sido tomada (demo)." });
  };

  const handleInscribir = () => {
    toast({
      title: "Jugador inscrito",
      description: "El jugador se ha registrado exitosamente (demo).",
    });
    setPhotoPreview(null);
  };

  const inscritos = players.filter((p) => p.status === "inscrito").length;
  const pendientes = players.filter((p) => p.status === "pendiente").length;
  const maxJugadores = 22;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">INSCRIPCION DE JUGADORES</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registra los jugadores de tu equipo en el campeonato
        </p>
      </div>

      {/* Championship & Team selector */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Campeonato</Label>
          <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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

      {/* Player list + Add */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cedula..."
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Inscribir Jugador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Inscribir Jugador
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Photo capture */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-28 w-28 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50 overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Foto jugador" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handlePhotoCapture} className="gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {photoPreview ? "Retomar foto" : "Tomar foto"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>Nombre completo</Label>
                  <Input placeholder="Ej: Roberto Sanchez" />
                </div>
                <div className="space-y-2">
                  <Label>Cedula / DNI</Label>
                  <Input placeholder="0901234567" />
                </div>
                <div className="space-y-2">
                  <Label>Numero</Label>
                  <Input type="number" placeholder="10" min={1} max={99} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Posicion</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Equipo: {selectedTeamData?.name}</p>
                <p>Campeonato: {selectedChamp?.name}</p>
                <p>Jugadores registrados: {players.length} / {maxJugadores}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleInscribir}>Inscribir</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead>Cedula</TableHead>
                <TableHead>Posicion</TableHead>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
