"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Copy, Check, UserCheck, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cupo {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    tempPassword: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    assignedTo: string | null;
    assignedAt: string | null;
  };
  team: { id: string; name: string } | null;
}

function CupoStatus({ cupo }: { cupo: Cupo }) {
  if (!cupo.user.isActive) {
    return <Badge variant="secondary">Inactivo</Badge>;
  }
  if (cupo.team) {
    return <Badge className="bg-primary/15 text-primary">Activo — {cupo.team.name}</Badge>;
  }
  if (cupo.user.assignedTo) {
    return <Badge className="bg-blue-500/15 text-blue-600">Asignado</Badge>;
  }
  return <Badge variant="outline">Disponible</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function CuposPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [cupos, setCupos] = useState<Cupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCupo, setSelectedCupo] = useState<Cupo | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCupos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/championships/${id}/cupos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCupos(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los cupos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchCupos(); }, [fetchCupos]);

  const openAssign = (cupo: Cupo) => {
    setSelectedCupo(cupo);
    setAssignedTo(cupo.user.assignedTo ?? "");
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedCupo || !assignedTo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/championships/${id}/cupos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedCupo.user.id, assignedTo: assignedTo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Cupo asignado", description: `Credencial entregada a: ${assignedTo}` });
      setAssignOpen(false);
      fetchCupos();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo asignar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const disponibles = cupos.filter((c) => !c.user.assignedTo && !c.team && c.user.isActive).length;
  const asignados = cupos.filter((c) => c.user.assignedTo && !c.team && c.user.isActive).length;
  const activos = cupos.filter((c) => c.team && c.user.isActive).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Gestión de cupos</h1>
          <p className="text-sm text-muted-foreground">Credenciales de acceso para delegados</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Shield className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="text-2xl font-bold">{cupos.length}</p>
              <p className="text-xs text-muted-foreground">Total cupos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-400/40" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{disponibles + asignados}</p>
              <p className="text-xs text-muted-foreground">{disponibles} disponibles · {asignados} asignados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary/40" />
            <div>
              <p className="text-2xl font-bold text-primary">{activos}</p>
              <p className="text-xs text-muted-foreground">Con equipo registrado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cupos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciales de delegado</CardTitle>
          <CardDescription>
            Comparte el email y la contraseña temporal con cada delegado. El delegado deberá cambiar
            la contraseña al ingresar por primera vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando cupos...</div>
          ) : cupos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Este campeonato no tiene cupos generados. Edita el campeonato y configura el número de equipos.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contraseña temporal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupos.map((cupo, i) => (
                  <TableRow key={cupo.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-sm">
                        {cupo.user.email}
                        <CopyButton text={cupo.user.email} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {cupo.user.tempPassword ? (
                        <div className="flex items-center gap-1 font-mono text-sm">
                          <span className="bg-muted rounded px-1.5 py-0.5">{cupo.user.tempPassword}</span>
                          <CopyButton text={cupo.user.tempPassword} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {cupo.user.mustChangePassword ? "Pendiente" : "Cambiada ✓"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CupoStatus cupo={cupo} />
                    </TableCell>
                    <TableCell>
                      {cupo.user.assignedTo ? (
                        <span className="text-sm">{cupo.user.assignedTo}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {cupo.user.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAssign(cupo)}
                        >
                          {cupo.user.assignedTo ? "Reasignar" : "Asignar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de asignación */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar cupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium font-mono">{selectedCupo?.user.email}</p>
              {selectedCupo?.user.tempPassword && (
                <p className="text-muted-foreground">
                  Contraseña: <span className="font-mono">{selectedCupo.user.tempPassword}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nombre del delegado o equipo</Label>
              <Input
                placeholder="Ej: Carlos Méndez / Club Deportivo Norte"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nota interna para recordar a quién se le entregaron estas credenciales.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAssign} disabled={saving || !assignedTo.trim()}>
              {saving ? "Guardando..." : "Confirmar asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
