"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Loader2, MapPin, Clock, Users, MoreHorizontal, KeyRound, ClipboardList, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sport, ChampionshipFormat, ChampionshipStatus } from "@/lib/generated/prisma/enums";
import { useSession } from "next-auth/react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface Championship {
  id: string;
  name: string;
  sport: Sport;
  format: ChampionshipFormat;
  status: ChampionshipStatus;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  matchDurationMin: number;
  titulares: number;
  suplentes: number;
  minSuplentes: number;
  maxEquipos: number;
  createdBy: { id: string; name: string };
  userRoles: { role: string; user: { id: string; name: string; email: string } }[];
  _count: { teams: number };
}

export type FormState = {
  name: string;
  sport: Sport | "";
  format: ChampionshipFormat | "";
  location: string;
  startDate: string;
  endDate: string;
  maxEquipos: number;
  matchDurationMin: number;
  titulares: number;
  suplentes: number;
  minSuplentes: number;
  organizadorId: string;
  tecnicoIds: string[];
};

// ─── Labels y badges ─────────────────────────────────────────────────────────

const sportLabels: Record<Sport, string> = {
  futbol: "Fútbol",
  futsal: "Futsal",
  baloncesto: "Baloncesto",
  voleibol: "Voleibol",
};

const formatLabels: Record<ChampionshipFormat, string> = {
  liga:               "Liga (todos contra todos)",
  eliminacion:        "Eliminación directa",
  grupos_eliminacion: "Grupos + Eliminación",
  personalizado:      "Personalizado",
};

const statusLabels: Record<ChampionshipStatus, string> = {
  borrador: "Borrador",
  inscripciones: "Inscripciones",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const statusBadge: Record<ChampionshipStatus, string> = {
  borrador: "bg-muted text-muted-foreground",
  inscripciones: "bg-blue-500/15 text-blue-600",
  en_curso: "bg-primary/15 text-primary",
  finalizado: "bg-secondary text-secondary-foreground",
};

// Transiciones permitidas por estado
const statusTransitions: Record<ChampionshipStatus, ChampionshipStatus[]> = {
  borrador:       [ChampionshipStatus.inscripciones],
  inscripciones:  [ChampionshipStatus.en_curso, ChampionshipStatus.borrador],
  en_curso:       [ChampionshipStatus.finalizado],
  finalizado:     [],
};

export const emptyForm: FormState = {
  name: "",
  sport: "",
  format: "",
  location: "",
  startDate: "",
  endDate: "",
  maxEquipos: 0,
  matchDurationMin: 90,
  titulares: 11,
  suplentes: 7,
  minSuplentes: 5,
  organizadorId: "",
  tecnicoIds: [],
};

// ─── ChampionshipForm (fuera del componente principal) ────────────────────────

interface ChampionshipFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  organizadores: UserOption[];
  tecnicos: UserOption[];
}

function ChampionshipForm({ form, setForm, organizadores, tecnicos }: ChampionshipFormProps) {
  const toggleTecnico = (id: string) => {
    setForm({
      ...form,
      tecnicoIds: form.tecnicoIds.includes(id)
        ? form.tecnicoIds.filter((t) => t !== id)
        : [...form.tecnicoIds, id],
    });
  };

  return (
    <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
      {/* Nombre */}
      <div className="space-y-2">
        <Label>Nombre del campeonato <span className="text-destructive">*</span></Label>
        <Input
          placeholder="Ej: Copa Verano 2026"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      {/* Deporte y formato */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Deporte <span className="text-destructive">*</span></Label>
          <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v as Sport })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {Object.entries(sportLabels).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Formato <span className="text-destructive">*</span></Label>
          <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as ChampionshipFormat })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {Object.entries(formatLabels).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ubicación */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Lugar / Sede
        </Label>
        <Input
          placeholder="Ej: Estadio Municipal, Canchas Norte"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Fecha de inicio</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de fin</Label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Configuración deportiva */}
      <div className="rounded-lg border border-border/60 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Configuración del partido
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Duración (min)</Label>
            <Input
              type="number"
              min={1}
              value={form.matchDurationMin}
              onChange={(e) => setForm({ ...form, matchDurationMin: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Mín. suplentes</Label>
            <Input
              type="number"
              min={0}
              max={form.suplentes}
              value={form.minSuplentes}
              onChange={(e) => setForm({ ...form, minSuplentes: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Mínimo requerido para completar planilla</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> N° de equipos
            </Label>
            <Input
              type="number"
              min={0}
              value={form.maxEquipos}
              onChange={(e) => setForm({ ...form, maxEquipos: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Se generarán credenciales de delegado automáticamente</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Titulares</Label>
            <Input
              type="number"
              min={1}
              value={form.titulares}
              onChange={(e) => setForm({ ...form, titulares: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Suplentes</Label>
            <Input
              type="number"
              min={0}
              value={form.suplentes}
              onChange={(e) => setForm({ ...form, suplentes: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Asignación de usuarios */}
      <div className="rounded-lg border border-border/60 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Asignación de personal
        </p>

        <div className="space-y-2">
          <Label>Organizador</Label>
          <Select
            value={form.organizadorId}
            onValueChange={(v) => setForm({ ...form, organizadorId: v === "none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin organizador asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {organizadores.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                  <span className="text-muted-foreground text-xs ml-1">({u.email})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tecnicos.length > 0 && (
          <div className="space-y-2">
            <Label>Técnicos</Label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto rounded border border-border/50 p-2">
              {tecnicos.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={form.tecnicoIds.includes(u.id)}
                    onCheckedChange={() => toggleTecnico(u.id)}
                  />
                  <span className="text-sm">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminChampionshipsPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editChamp, setEditChamp] = useState<Championship | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [organizadores, setOrganizadores] = useState<UserOption[]>([]);
  const [tecnicos, setTecnicos] = useState<UserOption[]>([]);
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === "administrador";

  const fetchChampionships = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (!isAdmin) params.set("mine", "true");
      const res = await fetch(`/api/championships?${params}`);
      const data = await res.json();
      setChampionships(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los campeonatos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast, isAdmin]);

  useEffect(() => {
    if (sessionStatus !== "loading") fetchChampionships();
  }, [fetchChampionships, sessionStatus]);

  useEffect(() => {
    fetch("/api/users?role=organizador")
      .then((r) => r.json())
      .then((d) => setOrganizadores(Array.isArray(d) ? d : []));
    fetch("/api/users?role=tecnico")
      .then((r) => r.json())
      .then((d) => setTecnicos(Array.isArray(d) ? d : []));
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.sport || !form.format) {
      toast({ title: "Campos incompletos", description: "Nombre, deporte y formato son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/championships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          matchDurationMin: Number(form.matchDurationMin),
          titulares: Number(form.titulares),
          suplentes: Number(form.suplentes),
          maxInscripciones: Number(form.titulares) + Number(form.suplentes),
          organizadorId: form.organizadorId || undefined,
          tecnicoIds: form.tecnicoIds.length ? form.tecnicoIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Campeonato creado", description: `"${form.name}" fue registrado exitosamente.` });
      setCreateOpen(false);
      setForm(emptyForm);
      fetchChampionships();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al crear", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: Championship) => {
    setEditChamp(c);
    const orgRole = c.userRoles.find((r) => r.role === "organizador");
    const tecRoles = c.userRoles.filter((r) => r.role === "tecnico");
    setForm({
      name: c.name,
      sport: c.sport,
      format: c.format,
      location: c.location ?? "",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
      matchDurationMin: c.matchDurationMin,
      titulares: c.titulares,
      suplentes: c.suplentes,
      minSuplentes: c.minSuplentes ?? 5,
      maxEquipos: c.maxEquipos ?? 0,
      organizadorId: orgRole?.user.id ?? "",
      tecnicoIds: tecRoles.map((r) => r.user.id),
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editChamp) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/championships/${editChamp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          matchDurationMin: Number(form.matchDurationMin),
          titulares: Number(form.titulares),
          suplentes: Number(form.suplentes),
          maxInscripciones: Number(form.titulares) + Number(form.suplentes),
          organizadorId: form.organizadorId || null,
          tecnicoIds: form.tecnicoIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Campeonato actualizado", description: "Los cambios fueron guardados." });
      setEditOpen(false);
      setEditChamp(null);
      setForm(emptyForm);
      fetchChampionships();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al actualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ChampionshipStatus) => {
    try {
      const res = await fetch(`/api/championships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Estado actualizado", description: `El campeonato pasó a "${statusLabels[status]}".` });
      fetchChampionships();
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/championships/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Campeonato eliminado" });
      fetchChampionships();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">
            {isAdmin ? "CAMPEONATOS" : "MIS CAMPEONATOS"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? "Crea y gestiona los campeonatos del sistema"
              : "Campeonatos asignados a ti como organizador"}
          </p>
        </div>

        {/* CREATE DIALOG — solo admin */}
        {isAdmin && (
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Campeonato</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Campeonato</DialogTitle>
              <DialogDescription>Configura todos los parámetros del campeonato.</DialogDescription>
            </DialogHeader>
            <ChampionshipForm
              form={form}
              setForm={setForm}
              organizadores={organizadores}
              tecnicos={tecnicos}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditChamp(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Campeonato</DialogTitle>
            <DialogDescription>Modifica la configuración del campeonato.</DialogDescription>
          </DialogHeader>
          <ChampionshipForm
            form={form}
            setForm={setForm}
            organizadores={organizadores}
            tecnicos={tecnicos}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditChamp(null); setForm(emptyForm); }}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campeonato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el campeonato y todos sus datos asociados. No se puede deshacer.
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

      {/* TABLE */}
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
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Deporte</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Config.</TableHead>
                  <TableHead>Personal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {championships.map((c) => {
                  const org = c.userRoles.find((r) => r.role === "organizador");
                  const tecCount = c.userRoles.filter((r) => r.role === "tecnico").length;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c._count.teams} equipos</p>
                      </TableCell>
                      <TableCell className="text-sm">{sportLabels[c.sport]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px]">
                        {formatLabels[c.format]}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.location || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{c.matchDurationMin} min</p>
                          <p>{c.titulares}+{c.suplentes} jug.</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {org ? (
                            <p className="text-foreground">{org.user.name}</p>
                          ) : (
                            <p className="text-muted-foreground">Sin org.</p>
                          )}
                          {tecCount > 0 && (
                            <p className="text-muted-foreground">{tecCount} técnico{tecCount > 1 ? "s" : ""}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[c.status]}`}>
                          {statusLabels[c.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                              {c.name}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Cambiar estado */}
                            {statusTransitions[c.status].length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Cambiar estado</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {statusTransitions[c.status].map((s) => (
                                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(c.id, s)}>
                                      <span className={`mr-2 h-2 w-2 rounded-full inline-block ${statusBadge[s].split(" ")[0]}`} />
                                      {statusLabels[s]}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}

                            <DropdownMenuSeparator />

                            {/* Navegación */}
                            {c.format === "personalizado" && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/campeonatos/${c.id}/fases`} className="flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5" /> Gestionar fases
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {c.maxEquipos > 0 && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/campeonatos/${c.id}/cupos`} className="flex items-center gap-2">
                                  <KeyRound className="h-3.5 w-3.5" /> Ver delegados
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/campeonatos/${c.id}/planillas`} className="flex items-center gap-2">
                                <ClipboardList className="h-3.5 w-3.5" /> Ver planillas
                              </Link>
                            </DropdownMenuItem>

                            {/* Solo admin */}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEdit(c)} className="flex items-center gap-2">
                                  <Pencil className="h-3.5 w-3.5" /> Editar campeonato
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(c.id)}
                                  className="text-destructive focus:text-destructive flex items-center gap-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Eliminar campeonato
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && championships.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron campeonatos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
