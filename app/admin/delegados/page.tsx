"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, Check, UserCheck, Clock, Shield, Loader2, MessageCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Championship {
  id: string;
  name: string;
  sport: string;
  status: string;
}

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

const sportLabels: Record<string, string> = {
  futbol: "Fútbol", futsal: "Futsal", baloncesto: "Baloncesto", voleibol: "Voleibol",
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CupoStatus({ cupo }: { cupo: Cupo }) {
  if (!cupo.user.isActive) return <Badge variant="secondary">Inactivo</Badge>;
  if (cupo.team) return <Badge className="bg-primary/15 text-primary border-0">Activo</Badge>;
  if (cupo.user.assignedTo) return <Badge className="bg-blue-500/15 text-blue-600 border-0">Asignado</Badge>;
  return <Badge variant="outline">Disponible</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminDelegadosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "administrador";
  const { toast } = useToast();

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [cupos, setCupos] = useState<Cupo[]>([]);
  const [loadingChamps, setLoadingChamps] = useState(true);
  const [loadingCupos, setLoadingCupos] = useState(false);

  // Dialog WhatsApp
  const [wsOpen, setWsOpen] = useState(false);
  const [selectedCupo, setSelectedCupo] = useState<Cupo | null>(null);
  const [wsPhone, setWsPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar campeonatos (admin = todos, organizador = solo los suyos)
  useEffect(() => {
    const url = isAdmin ? "/api/championships" : "/api/championships?mine=true";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setChampionships(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .finally(() => setLoadingChamps(false));
  }, [isAdmin]);

  // Cargar cupos del campeonato seleccionado
  const fetchCupos = useCallback(async () => {
    if (!selectedId) return;
    setLoadingCupos(true);
    try {
      const res = await fetch(`/api/championships/${selectedId}/cupos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCupos(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al cargar", variant: "destructive" });
    } finally {
      setLoadingCupos(false);
    }
  }, [selectedId, toast]);

  useEffect(() => { fetchCupos(); }, [fetchCupos]);

  const openWs = (cupo: Cupo) => {
    setSelectedCupo(cupo);
    setWsPhone("");
    setWsOpen(true);
  };

  const handleSendWs = async () => {
    if (!selectedCupo || !wsPhone.trim()) return;
    const phone = wsPhone.trim().replace(/\D/g, "");
    if (phone.length < 7) {
      toast({ title: "Número inválido", description: "Ingresa un número válido.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Guardar el número en BD como registro
      const res = await fetch(`/api/championships/${selectedId}/cupos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedCupo.user.id, assignedTo: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Construir mensaje con credenciales
      const champName = championships.find((c) => c.id === selectedId)?.name ?? "el campeonato";
      const mensaje = [
        `Hola! Te comparto tus credenciales para *${champName}*:`,
        ``,
        `📧 Usuario: ${selectedCupo.user.email}`,
        `🔑 Contraseña: ${selectedCupo.user.tempPassword}`,
        ``,
        `Ingresa en: ${window.location.origin}/login`,
        ``,
        `Al iniciar sesión por primera vez deberás configurar tu cuenta con tu correo y contraseña definitivos.`,
      ].join("\n");

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, "_blank");

      setWsOpen(false);
      fetchCupos();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al enviar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const disponibles = cupos.filter((c) => !c.user.assignedTo && !c.team && c.user.isActive).length;
  const asignados   = cupos.filter((c) =>  c.user.assignedTo && !c.team && c.user.isActive).length;
  const activos     = cupos.filter((c) =>  c.team && c.user.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">DELEGADOS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona las credenciales de acceso de los delegados por campeonato
        </p>
      </div>

      {/* Selector de campeonato */}
      {loadingChamps ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando campeonatos...
        </div>
      ) : championships.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No tienes campeonatos asignados</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Crea un campeonato para comenzar." : "El administrador debe asignarte como organizador de un campeonato."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="max-w-sm space-y-2">
            <Label className="text-xs text-muted-foreground">Campeonato</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {championships.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    <span className="text-muted-foreground text-xs ml-1">— {sportLabels[c.sport] ?? c.sport}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-muted">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-display">{cupos.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total cupos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-display">{disponibles + asignados}</p>
                  <p className="text-[10px] text-muted-foreground">{disponibles} disponibles · {asignados} asignados</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl p-2.5 bg-primary/10">
                  <UserCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-display">{activos}</p>
                  <p className="text-[10px] text-muted-foreground">Con equipo registrado</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de cupos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciales de delegado</CardTitle>
              <CardDescription>
                Comparte el email y la contraseña temporal con cada delegado. Deberán cambiarla al ingresar por primera vez.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCupos ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : cupos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Este campeonato no tiene cupos generados. Edita el campeonato y configura el número de equipos.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Delegado</TableHead>
                      <TableHead>Credenciales</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cupos.map((cupo, i) => {
                      const configured = !cupo.user.mustChangePassword && !cupo.user.tempPassword;
                      return (
                      <TableRow key={cupo.id}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>

                        {/* Delegado */}
                        <TableCell>
                          {configured ? (
                            <div>
                              <p className="text-sm font-medium">{cupo.user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{cupo.user.email}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                              {cupo.user.email}
                              <CopyButton text={cupo.user.email} />
                            </div>
                          )}
                        </TableCell>

                        {/* Credenciales */}
                        <TableCell>
                          {cupo.user.tempPassword ? (
                            <div className="flex items-center gap-1 font-mono text-sm">
                              <span className="bg-muted rounded px-1.5 py-0.5">{cupo.user.tempPassword}</span>
                              <CopyButton text={cupo.user.tempPassword} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {cupo.user.mustChangePassword ? "Pendiente" : "Configurada ✓"}
                            </span>
                          )}
                        </TableCell>

                        {/* Equipo registrado */}
                        <TableCell className="text-sm">
                          {cupo.team
                            ? <span className="font-medium">{cupo.team.name}</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>

                        <TableCell><CupoStatus cupo={cupo} /></TableCell>

                        <TableCell className="text-right">
                          {cupo.user.isActive && !configured && (
                            cupo.user.assignedTo ? (
                              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {cupo.user.assignedTo}
                              </span>
                            ) : (
                              <Button variant="ghost" size="sm" className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openWs(cupo)}>
                                <MessageCircle className="h-4 w-4" />
                                Enviar WS
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog WhatsApp */}
      <Dialog open={wsOpen} onOpenChange={setWsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar credenciales por WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-mono text-xs">{selectedCupo?.user.email}</p>
              {selectedCupo?.user.tempPassword && (
                <p className="text-muted-foreground text-xs">
                  Contraseña: <span className="font-mono font-medium">{selectedCupo.user.tempPassword}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Número de WhatsApp
              </Label>
              <Input
                placeholder="Ej: 593991234567"
                value={wsPhone}
                onChange={(e) => setWsPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendWs()}
                type="tel"
              />
              <p className="text-xs text-muted-foreground">
                Incluye el código de país sin el +. Ej: 593 para Ecuador.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSendWs} disabled={saving || !wsPhone.trim()} className="gap-1.5 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
