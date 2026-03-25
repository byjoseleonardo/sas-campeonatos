"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Calendar, Users, Layers, Clock, MapPin,
} from "lucide-react";
import { championships, teams } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface Group {
  id: string;
  name: string;
  championshipId: string;
  teams: string[];
}

const mockGroups: Group[] = [
  { id: "g1", name: "Grupo A", championshipId: "1", teams: ["Águilas FC", "Leones SC"] },
  { id: "g2", name: "Grupo B", championshipId: "1", teams: ["Rayos FC", "Truenos SC"] },
];

interface ScheduledMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  location: string;
  jornada: number;
  championshipId: string;
  status: "programado" | "en_vivo" | "finalizado";
}

const mockScheduledMatches: ScheduledMatch[] = [
  { id: "sm1", homeTeam: "Águilas FC", awayTeam: "Leones SC", date: "27 Mar 2026", time: "19:00", location: "Cancha 1", jornada: 3, championshipId: "1", status: "programado" },
  { id: "sm2", homeTeam: "Rayos FC", awayTeam: "Truenos SC", date: "27 Mar 2026", time: "21:00", location: "Cancha 2", jornada: 3, championshipId: "1", status: "programado" },
  { id: "sm3", homeTeam: "Leones SC", awayTeam: "Rayos FC", date: "20 Mar 2026", time: "19:00", location: "Cancha 1", jornada: 2, championshipId: "1", status: "finalizado" },
  { id: "sm4", homeTeam: "Truenos SC", awayTeam: "Águilas FC", date: "20 Mar 2026", time: "21:00", location: "Cancha 2", jornada: 2, championshipId: "1", status: "finalizado" },
];

export default function AdminSupervisoresPage() {
  const [selectedChampionship, setSelectedChampionship] = useState("1");
  const [activeTab, setActiveTab] = useState("partidos");
  const { toast } = useToast();

  const champTeams = teams.filter((t) => t.championshipId === selectedChampionship);
  const champMatches = mockScheduledMatches.filter((m) => m.championshipId === selectedChampionship);
  const champGroups = mockGroups.filter((g) => g.championshipId === selectedChampionship);

  const handleCreateMatch = () => {
    toast({ title: "Partido creado", description: "El partido ha sido programado exitosamente (demo)." });
  };

  const handleCreateGroup = () => {
    toast({ title: "Grupo creado", description: "El grupo ha sido creado exitosamente (demo)." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">SUPERVISOR</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea partidos, arma grupos y gestiona la programación del campeonato
        </p>
      </div>

      {/* Championship selector */}
      <div className="max-w-sm space-y-2">
        <Label className="text-xs text-muted-foreground">Campeonato asignado</Label>
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

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display">{champTeams.length}</p>
              <p className="text-[10px] text-muted-foreground">Equipos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-blue-500/10">
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-display">{champGroups.length}</p>
              <p className="text-[10px] text-muted-foreground">Grupos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-accent/10">
              <Calendar className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xl font-display">{champMatches.length}</p>
              <p className="text-[10px] text-muted-foreground">Partidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-display">
                {champMatches.filter((m) => m.status === "programado").length}
              </p>
              <p className="text-[10px] text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="partidos" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Partidos
          </TabsTrigger>
          <TabsTrigger value="grupos" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Grupos
          </TabsTrigger>
        </TabsList>

        {/* PARTIDOS TAB */}
        <TabsContent value="partidos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Programar Partido
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Programar Partido</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Equipo Local</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {champTeams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Equipo Visitante</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {champTeams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Jornada</Label>
                      <Input type="number" placeholder="1" min={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación / Cancha</Label>
                    <Input placeholder="Ej: Cancha 1 - Estadio Central" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreateMatch}>Programar</Button>
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
                    <TableHead>Jornada</TableHead>
                    <TableHead>Partido</TableHead>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {champMatches
                    .sort((a, b) => a.jornada - b.jornada)
                    .map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-display">J{m.jornada}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {m.homeTeam}
                            <span className="text-muted-foreground text-xs">vs</span>
                            {m.awayTeam}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.date} · {m.time}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {m.location}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.status === "finalizado"
                              ? "bg-muted text-muted-foreground"
                              : m.status === "en_vivo"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary/15 text-primary"
                          }`}>
                            {m.status === "programado" ? "Programado" : m.status === "en_vivo" ? "En Vivo" : "Finalizado"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {champMatches.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No hay partidos programados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRUPOS TAB */}
        <TabsContent value="grupos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Crear Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Nombre del grupo</Label>
                    <Input placeholder="Ej: Grupo A" />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipos del grupo</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Selecciona los equipos inscritos para este grupo
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                      {champTeams.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" className="rounded border-input" />
                          <span>{t.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{t.players} jugadores</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreateGroup}>Crear</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {champGroups.map((g) => (
              <Card key={g.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-display text-lg">{g.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {g.teams.map((teamName) => (
                      <div key={teamName} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-display text-primary">
                          {teamName.charAt(0)}
                        </div>
                        {teamName}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {g.teams.length} equipos en este grupo
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {champGroups.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay grupos creados para este campeonato
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crea grupos para organizar la fase clasificatoria
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
