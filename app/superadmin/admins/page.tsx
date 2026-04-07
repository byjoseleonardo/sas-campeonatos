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
import { Plus, Search, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Admin {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { firstName: "", paternalLastName: "", maternalLastName: "", email: "", password: "" };

function adminFullName(a: Admin) {
  return [a.firstName, a.paternalLastName, a.maternalLastName].filter(Boolean).join(" ");
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/superadmin/admins?${params}`);
      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los administradores", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = async () => {
    if (!form.firstName || !form.paternalLastName || !form.email || !form.password) {
      toast({ title: "Campos incompletos", description: "Completa nombre, apellido paterno, correo y contraseña.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Administrador creado", description: `${form.firstName} ${form.paternalLastName} fue registrado exitosamente.` });
      setCreateOpen(false);
      setForm(emptyForm);
      fetchAdmins();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al crear", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.firstName) body.firstName = form.firstName;
      if (form.paternalLastName) body.paternalLastName = form.paternalLastName;
      body.maternalLastName = form.maternalLastName || null;
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/superadmin/admins/${editAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Administrador actualizado", description: "Los cambios fueron guardados." });
      setEditOpen(false);
      setEditAdmin(null);
      setForm(emptyForm);
      fetchAdmins();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al actualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin: Admin) => {
    try {
      const res = await fetch(`/api/superadmin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: admin.isActive ? "Administrador desactivado" : "Administrador activado",
        description: `${adminFullName(admin)} fue ${admin.isActive ? "desactivado" : "activado"}.`,
      });
      fetchAdmins();
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteAdminId) return;
    try {
      const res = await fetch(`/api/superadmin/admins/${deleteAdminId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Administrador eliminado", description: "El administrador fue removido del sistema." });
      fetchAdmins();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el administrador", variant: "destructive" });
    } finally {
      setDeleteAdminId(null);
    }
  };

  const openEdit = (admin: Admin) => {
    setEditAdmin(admin);
    setForm({
      firstName: admin.firstName,
      paternalLastName: admin.paternalLastName,
      maternalLastName: admin.maternalLastName ?? "",
      email: admin.email,
      password: "",
    });
    setEditOpen(true);
  };

  const filtered = admins.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return adminFullName(a).toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">ADMINISTRADORES</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los clientes del SAS Campeonatos</p>
        </div>

        {/* CREATE DIALOG */}
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Administrador</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Administrador</DialogTitle>
              <DialogDescription>Registra un nuevo cliente en la plataforma.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Juan" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido paterno</Label>
                  <Input placeholder="Ej: Pérez" value={form.paternalLastName} onChange={(e) => setForm({ ...form, paternalLastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Apellido materno <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input placeholder="Ej: García" value={form.maternalLastName} onChange={(e) => setForm({ ...form, maternalLastName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" placeholder="admin@empresa.com" autoComplete="new-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditAdmin(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Administrador</DialogTitle>
            <DialogDescription>Modifica los datos del administrador.</DialogDescription>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditAdmin(null); setForm(emptyForm); }}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteAdminId} onOpenChange={(v) => !v && setDeleteAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al administrador y todos sus organizadores y campeonatos asociados. No se puede deshacer.
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
                  <TableHead>Administrador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm">
                          {a.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{adminFullName(a)}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {a.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={a.isActive ? "Desactivar" : "Activar"}
                          onClick={() => handleToggleActive(a)}
                        >
                          {a.isActive
                            ? <ToggleRight className="h-3.5 w-3.5 text-primary" />
                            : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteAdminId(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No se encontraron administradores</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
