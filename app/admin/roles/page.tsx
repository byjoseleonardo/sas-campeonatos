"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
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
import { championships } from "@/lib/mockData";

type Role = "administrador" | "organizador" | "supervisor" | "tecnico" | "delegado";

interface UserRole {
  id: string;
  role: Role;
  championship?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  userRoles: UserRole[];
}

const roleLabels: Record<Role, string> = {
  administrador: "Administrador",
  organizador: "Organizador",
  supervisor: "Supervisor",
  tecnico: "Técnico",
  delegado: "Delegado",
};

const roleBadgeVariants: Record<Role, string> = {
  administrador: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  organizador: "bg-primary/15 text-primary border-primary/30",
  supervisor: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  tecnico: "bg-accent/15 text-accent-foreground border-accent/30",
  delegado: "bg-secondary/80 text-secondary-foreground border-secondary",
};

// El administrador solo puede crear organizadores y tecnicos
const CREATABLE_ROLES: Role[] = ["organizador", "tecnico"];
// Todos los roles para filtros de visualizacion
const ALL_ROLES: Role[] = ["administrador", "organizador", "supervisor", "tecnico", "delegado"];
// Roles con scope de campeonato
const SCOPED_ROLES: Role[] = ["organizador", "tecnico"];

const emptyForm = { name: "", email: "", password: "", role: "" as Role | "", championshipId: "" };

export default function AdminRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [form, setForm] = useState(emptyForm);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "todos") params.set("role", roleFilter);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los usuarios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      toast({ title: "Campos incompletos", description: "Completa todos los campos requeridos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          championshipId: form.championshipId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuario creado", description: `${form.name} fue registrado exitosamente.` });
      setCreateOpen(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al crear usuario", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.name) body.name = form.name;
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (form.role) body.role = form.role;
      if (form.championshipId) body.championshipId = form.championshipId;

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuario actualizado", description: "Los cambios fueron guardados." });
      setEditOpen(false);
      setEditUser(null);
      setForm(emptyForm);
      fetchUsers();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al actualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      const res = await fetch(`/api/users/${deleteUserId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Usuario eliminado", description: "El usuario fue removido del sistema." });
      fetchUsers();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el usuario", variant: "destructive" });
    } finally {
      setDeleteUserId(null);
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    const firstRole = user.userRoles[0];
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: firstRole?.role || "",
      championshipId: firstRole?.championship?.id || "",
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">ROLES Y USUARIOS</h1>
          <p className="text-muted-foreground text-sm mt-1">Crea y gestiona los usuarios del sistema</p>
        </div>

        {/* CREATE DIALOG */}
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
              <DialogDescription>Registra un organizador o técnico en el sistema.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input placeholder="Ej: Juan Pérez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" placeholder="juan@email.com" autoComplete="new-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role, championshipId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {CREATABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {SCOPED_ROLES.includes(form.role as Role) && (
                <div className="space-y-2">
                  <Label>Campeonato <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Select value={form.championshipId} onValueChange={(v) => setForm({ ...form, championshipId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar campeonato" /></SelectTrigger>
                    <SelectContent>
                      {championships.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditUser(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica los datos del usuario seleccionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role, championshipId: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREATABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {SCOPED_ROLES.includes(form.role as Role) && (
              <div className="space-y-2">
                <Label>Campeonato</Label>
                <Select value={form.championshipId} onValueChange={(v) => setForm({ ...form, championshipId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar campeonato" /></SelectTrigger>
                  <SelectContent>
                    {championships.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditUser(null); setForm(emptyForm); }}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(v) => !v && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario y todos sus roles asignados serán eliminados.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                className="max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["todos", ...ALL_ROLES].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    roleFilter === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {r === "todos" ? "Todos" : roleLabels[r as Role]}
                </button>
              ))}
            </div>
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Campeonato</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const firstRole = u.userRoles[0];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-display text-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {firstRole ? (
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadgeVariants[firstRole.role]}`}>
                            {roleLabels[firstRole.role]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin rol</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {firstRole?.championship?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteUserId(u.id)}
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
          {!loading && users.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No se encontraron usuarios</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
