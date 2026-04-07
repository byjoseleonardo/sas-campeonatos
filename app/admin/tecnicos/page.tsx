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
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Championship {
  id: string;
  name: string;
}

interface UserRoleInfo {
  id: string;
  role: string;
  championship?: { id: string; name: string } | null;
}

interface Tecnico {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
  userRoles: UserRoleInfo[];
}

function tecnicoFullName(t: Tecnico) {
  return [t.firstName, t.paternalLastName, t.maternalLastName].filter(Boolean).join(" ");
}

const emptyForm = { firstName: "", paternalLastName: "", maternalLastName: "", email: "", password: "", championshipId: "" };

export default function AdminTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editTecnico, setEditTecnico] = useState<Tecnico | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const fetchTecnicos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: "tecnico_mesa" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setTecnicos(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los técnicos de mesa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => { fetchTecnicos(); }, [fetchTecnicos]);

  useEffect(() => {
    fetch("/api/championships")
      .then((r) => r.json())
      .then((d) => setChampionships(Array.isArray(d) ? d.map((c: Championship) => ({ id: c.id, name: c.name })) : []));
  }, []);

  const handleCreate = async () => {
    if (!form.firstName || !form.paternalLastName || !form.email || !form.password) {
      toast({ title: "Campos incompletos", description: "Nombre, apellido paterno, correo y contraseña son requeridos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          paternalLastName: form.paternalLastName,
          maternalLastName: form.maternalLastName || undefined,
          email: form.email,
          password: form.password,
          role: "tecnico_mesa",
          championshipId: form.championshipId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Técnico de mesa creado", description: `${form.firstName} ${form.paternalLastName} fue registrado exitosamente.` });
      setCreateOpen(false);
      setForm(emptyForm);
      fetchTecnicos();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al crear", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTecnico) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.firstName) body.firstName = form.firstName;
      if (form.paternalLastName) body.paternalLastName = form.paternalLastName;
      body.maternalLastName = form.maternalLastName || null;
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (form.championshipId !== undefined) body.championshipId = form.championshipId || null;

      const res = await fetch(`/api/users/${editTecnico.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Técnico actualizado", description: "Los cambios fueron guardados." });
      setEditOpen(false);
      setEditTecnico(null);
      setForm(emptyForm);
      fetchTecnicos();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al actualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Técnico eliminado", description: "El técnico de mesa fue removido del sistema." });
      fetchTecnicos();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el técnico", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (t: Tecnico) => {
    setEditTecnico(t);
    const firstRole = t.userRoles[0];
    setForm({
      firstName: t.firstName,
      paternalLastName: t.paternalLastName,
      maternalLastName: t.maternalLastName ?? "",
      email: t.email,
      password: "",
      championshipId: firstRole?.championship?.id ?? "",
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">TÉCNICOS DE MESA</h1>
          <p className="text-muted-foreground text-sm mt-1">Crea y gestiona los técnicos de mesa de tus campeonatos</p>
        </div>

        {/* CREATE DIALOG */}
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Técnico de Mesa</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Técnico de Mesa</DialogTitle>
              <DialogDescription>Registra un técnico de mesa y asígnalo a un campeonato.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Carlos" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido paterno</Label>
                  <Input placeholder="Ej: Mendoza" value={form.paternalLastName} onChange={(e) => setForm({ ...form, paternalLastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Apellido materno <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input placeholder="Ej: Torres" value={form.maternalLastName} onChange={(e) => setForm({ ...form, maternalLastName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" placeholder="tecnico@email.com" autoComplete="new-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Campeonato <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={form.championshipId} onValueChange={(v) => setForm({ ...form, championshipId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {championships.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditTecnico(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Técnico de Mesa</DialogTitle>
            <DialogDescription>Modifica los datos del técnico de mesa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Apellido paterno</Label>
                <Input value={form.paternalLastName} onChange={(e) => setForm({ ...form, paternalLastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Apellido materno <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input value={form.maternalLastName} onChange={(e) => setForm({ ...form, maternalLastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" autoComplete="new-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nueva contraseña <span className="text-muted-foreground text-xs">(dejar vacío para no cambiar)</span></Label>
              <Input type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Campeonato</Label>
              <Select value={form.championshipId} onValueChange={(v) => setForm({ ...form, championshipId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {championships.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditTecnico(null); setForm(emptyForm); }}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar técnico de mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al técnico de mesa y todos sus registros asociados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              placeholder="Buscar por nombre o correo..."
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
                  <TableHead>Técnico de Mesa</TableHead>
                  <TableHead>Campeonato asignado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tecnicos.map((t) => {
                  const firstRole = t.userRoles[0];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm">
                            {t.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tecnicoFullName(t)}</p>
                            <p className="text-xs text-muted-foreground">{t.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {firstRole?.championship?.name || "Sin asignar"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {t.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && tecnicos.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No hay técnicos de mesa registrados. Crea el primero con el botón de arriba.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
