"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { championships } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const statusMap: Record<string, string> = {
  activo: "En curso",
  inscripciones: "Inscripciones",
  finalizado: "Finalizado",
};

const statusBadge: Record<string, string> = {
  activo: "bg-primary/15 text-primary",
  inscripciones: "bg-accent/15 text-accent-foreground",
  finalizado: "bg-muted text-muted-foreground",
};

export default function AdminChampionshipsPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = championships.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    toast({
      title: "Campeonato creado",
      description: "El campeonato se ha creado exitosamente (demo).",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">CAMPEONATOS</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crea y gestiona campeonatos
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Campeonato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Campeonato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Copa Verano 2026" />
              </div>
              <div className="space-y-2">
                <Label>Deporte</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="futbol">Fútbol</SelectItem>
                    <SelectItem value="baloncesto">Baloncesto</SelectItem>
                    <SelectItem value="voleibol">Voleibol</SelectItem>
                    <SelectItem value="futsal">Futsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liga">Liga (todos contra todos)</SelectItem>
                    <SelectItem value="eliminacion">Eliminación directa</SelectItem>
                    <SelectItem value="grupos">Fase de grupos + eliminación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="month" />
                </div>
                <div className="space-y-2">
                  <Label>Equipos</Label>
                  <Input type="number" placeholder="16" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input placeholder="Ej: Estadio Central" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleCreate}>Crear</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campeonato..."
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Deporte</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Equipos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.sport}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.format}
                  </TableCell>
                  <TableCell>{c.teams}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[c.status]}`}
                    >
                      {statusMap[c.status]}
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
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron campeonatos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
