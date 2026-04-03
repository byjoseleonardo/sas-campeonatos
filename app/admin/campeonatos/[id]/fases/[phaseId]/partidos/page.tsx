"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Swords, MapPin, Calendar, Tag, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Team { id: string; name: string }

interface Group {
  id: string;
  name: string;
  teams: Team[];
}

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  scheduledAt: string | null;
  venue: string | null;
  roundLabel: string | null;
  status: string;
  homeScore: number;
  awayScore: number;
}

interface Phase {
  id: string;
  name: string;
  type: string;
}

interface Championship {
  id: string;
  name: string;
  status: string;
}

type FormState = {
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: string;
  scheduledTime: string;
  venue: string;
  roundLabel: string;
};

const emptyForm: FormState = {
  homeTeamId: "", awayTeamId: "",
  scheduledDate: "", scheduledTime: "",
  venue: "", roundLabel: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_curso:   "bg-primary/15 text-primary",
  finalizado: "bg-green-500/15 text-green-700",
  suspendido: "bg-destructive/15 text-destructive",
  postergado: "bg-amber-500/15 text-amber-700",
};

const statusLabel: Record<string, string> = {
  programado: "Programado",
  en_curso:   "En curso",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  postergado: "Postergado",
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

function groupMatches(matches: Match[]) {
  const groups: Record<string, Match[]> = {};
  for (const m of matches) {
    const key = m.roundLabel ?? "";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return groups;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PartidosPage({
  params,
}: {
  params: Promise<{ id: string; phaseId: string }>;
}) {
  const { id, phaseId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [champ, setChamp]     = useState<Championship | null>(null);
  const [phase, setPhase]     = useState<Phase | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [groups, setGroups]   = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Grupo seleccionado para filtrar ("" = todos)
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const [formOpen, setFormOpen]   = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(emptyForm);

  const isLocked = champ?.status === "en_curso" || champ?.status === "finalizado";
  const isGroupPhase = phase?.type === "grupos";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/championships/${id}`),
        fetch(`/api/championships/${id}/phases`),
        fetch(`/api/championships/${id}/teams`),
        fetch(`/api/championships/${id}/phases/${phaseId}/matches`),
      ];

      const [cRes, phRes, tRes, mRes] = await Promise.all(fetches);
      const [cData, pData, tData, mData] = await Promise.all([
        cRes.json(), phRes.json(), tRes.json(), mRes.json(),
      ]);

      setChamp(cData);
      const phases = Array.isArray(pData) ? pData : [];
      const currentPhase = phases.find((p: Phase) => p.id === phaseId) ?? null;
      setPhase(currentPhase);
      setAllTeams(Array.isArray(tData) ? tData.map((t: Team) => ({ id: t.id, name: t.name })) : []);
      setMatches(Array.isArray(mData) ? mData : []);

      // Si es fase de grupos, cargar grupos del campeonato
      if (currentPhase?.type === "grupos") {
        const gRes = await fetch(`/api/championships/${id}/groups`);
        const gData = await gRes.json();
        setGroups(Array.isArray(gData) ? gData : []);
      }
    } finally {
      setLoading(false);
    }
  }, [id, phaseId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Equipos disponibles según el grupo seleccionado
  const availableTeams: Team[] = isGroupPhase && selectedGroup
    ? (groups.find((g) => g.id === selectedGroup)?.teams ?? [])
    : allTeams;

  // Partidos filtrados por grupo seleccionado
  const filteredMatches: Match[] = isGroupPhase && selectedGroup
    ? matches.filter((m) => {
        const groupTeamIds = new Set(
          groups.find((g) => g.id === selectedGroup)?.teams.map((t) => t.id) ?? []
        );
        return groupTeamIds.has(m.homeTeamId) && groupTeamIds.has(m.awayTeamId);
      })
    : matches;

  const openCreate = () => {
    setEditMatch(null);
    // Pre-rellenar roundLabel con el nombre del grupo si hay uno seleccionado
    const groupName = selectedGroup
      ? groups.find((g) => g.id === selectedGroup)?.name ?? ""
      : "";
    setForm({ ...emptyForm, roundLabel: groupName });
    setFormOpen(true);
  };

  const openEdit = (match: Match) => {
    setEditMatch(match);
    const dt = match.scheduledAt ? new Date(match.scheduledAt) : null;
    setForm({
      homeTeamId:    match.homeTeamId,
      awayTeamId:    match.awayTeamId,
      scheduledDate: dt ? dt.toISOString().slice(0, 10) : "",
      scheduledTime: dt ? dt.toTimeString().slice(0, 5) : "",
      venue:         match.venue ?? "",
      roundLabel:    match.roundLabel ?? "",
    });
    setFormOpen(true);
  };

  const buildScheduledAt = () => {
    if (!form.scheduledDate) return null;
    return new Date(`${form.scheduledDate}T${form.scheduledTime || "00:00"}`).toISOString();
  };

  const handleSave = async () => {
    if (!form.homeTeamId || !form.awayTeamId) {
      toast({ title: "Selecciona ambos equipos", variant: "destructive" });
      return;
    }
    if (form.homeTeamId === form.awayTeamId) {
      toast({ title: "Los equipos no pueden ser iguales", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        homeTeamId:  form.homeTeamId,
        awayTeamId:  form.awayTeamId,
        scheduledAt: buildScheduledAt(),
        venue:       form.venue.trim() || null,
        roundLabel:  form.roundLabel.trim() || null,
      };
      const url = editMatch
        ? `/api/championships/${id}/phases/${phaseId}/matches/${editMatch.id}`
        : `/api/championships/${id}/phases/${phaseId}/matches`;
      const res = await fetch(url, {
        method: editMatch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: editMatch ? "Partido actualizado" : "Partido creado" });
      setFormOpen(false);
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(
        `/api/championships/${id}/phases/${phaseId}/matches/${deleteId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Partido eliminado" });
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo eliminar", variant: "destructive" });
    } finally {
      setDeleteId(null); }
  };

  const grouped = groupMatches(filteredMatches);
  const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push(`/admin/campeonatos/${id}/fases`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Fases — {champ?.name}
          </button>
          <h1 className="font-display text-4xl text-foreground">PARTIDOS</h1>
          {phase && <p className="text-muted-foreground text-sm mt-1">{phase.name}</p>}
        </div>
        {!isLocked && (
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Agregar partido
          </Button>
        )}
      </div>

      {/* Filtro por grupo — solo si es fase de grupos y hay grupos sorteados */}
      {isGroupPhase && groups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium uppercase tracking-wide">Filtrar por grupo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroup("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedGroup === ""
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              Todos ({matches.length})
            </button>
            {groups.map((g) => {
              const count = matches.filter((m) => {
                const ids = new Set(g.teams.map((t) => t.id));
                return ids.has(m.homeTeamId) && ids.has(m.awayTeamId);
              }).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedGroup === g.id
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-border text-muted-foreground hover:border-violet-400 hover:text-violet-600"
                  }`}
                >
                  {g.name} · {g.teams.length} eq. · {count} partidos
                </button>
              );
            })}
          </div>

          {/* Equipos del grupo seleccionado */}
          {selectedGroup && (
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 px-3 py-2 flex flex-wrap gap-2">
              {groups.find((g) => g.id === selectedGroup)?.teams.map((t) => (
                <span key={t.id} className="text-xs bg-violet-500/10 text-violet-700 rounded px-2 py-0.5 font-medium">
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aviso si es fase de grupos pero sin sorteo */}
      {isGroupPhase && groups.length === 0 && !loading && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700">
          No hay grupos sorteados aún. Realiza el sorteo desde la página de fases para poder filtrar por grupo.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">
              {selectedGroup
                ? `Sin partidos en ${groups.find((g) => g.id === selectedGroup)?.name}`
                : "Sin partidos en esta fase"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedGroup
                ? "Agrega partidos entre los equipos de este grupo."
                : "Agrega los partidos que se jugarán en esta fase."}
            </p>
            {!isLocked && (
              <Button onClick={openCreate} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Agregar partido
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((key) => (
            <div key={key} className="space-y-2">
              {key && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
                </div>
              )}
              {grouped[key].map((match) => {
                const dt = formatDateTime(match.scheduledAt);
                const isDone = match.status === "finalizado";
                return (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <p className="text-sm font-medium text-right">{match.homeTeam.name}</p>
                          <div className="flex items-center gap-1.5">
                            {isDone ? (
                              <span className="font-display text-xl tabular-nums">
                                {match.homeScore} — {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm font-medium">vs</span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{match.awayTeam.name}</p>
                        </div>

                        <div className="hidden sm:flex flex-col gap-0.5 items-end text-xs text-muted-foreground shrink-0 min-w-[120px]">
                          {dt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {dt.date} {dt.time}
                            </span>
                          )}
                          {match.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {match.venue}
                            </span>
                          )}
                        </div>

                        <Badge className={`shrink-0 text-xs border-0 ${statusBadge[match.status]}`}>
                          {statusLabel[match.status]}
                        </Badge>

                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(match)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!isLocked && match.status !== "finalizado" && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(match.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Dialog crear/editar partido */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditMatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMatch ? "Editar partido" : "Nuevo partido"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Equipos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Equipos</p>
                {/* Selector de grupo dentro del form — solo si es fase de grupos */}
                {isGroupPhase && groups.length > 0 && (
                  <Select
                    value={selectedGroup || "todos"}
                    onValueChange={(v) => {
                      const newGroup = v === "todos" ? "" : v;
                      setSelectedGroup(newGroup);
                      // Limpiar equipos y actualizar roundLabel
                      const groupName = newGroup
                        ? groups.find((g) => g.id === newGroup)?.name ?? ""
                        : "";
                      setForm((f) => ({ ...f, homeTeamId: "", awayTeamId: "", roundLabel: groupName }));
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los equipos</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Local</Label>
                  <Select value={form.homeTeamId} onValueChange={(v) => setForm({ ...form, homeTeamId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id} disabled={t.id === form.awayTeamId}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground font-medium text-sm mt-5">vs</span>
                <div className="space-y-1.5">
                  <Label className="text-xs">Visitante</Label>
                  <Select value={form.awayTeamId} onValueChange={(v) => setForm({ ...form, awayTeamId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id} disabled={t.id === form.homeTeamId}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Etiqueta de ronda */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Tag className="h-3 w-3 text-muted-foreground" /> Etiqueta de ronda
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Ej: Grupo A, Jornada 1..."
                value={form.roundLabel}
                onChange={(e) => setForm({ ...form, roundLabel: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Agrupa los partidos bajo esta etiqueta. Si seleccionas un grupo se rellena automáticamente.
              </p>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" /> Fecha
                </Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            {/* Sede */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3 text-muted-foreground" /> Sede
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Ej: Estadio Municipal, Cancha Norte"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editMatch ? "Guardar cambios" : "Crear partido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el partido y todos sus eventos registrados.
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
    </div>
  );
}
