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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Swords, MapPin, Calendar, Tag, Users, Eye, Wand2, CheckCircle2, RotateCcw, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Team { id: string; name: string }

interface Group {
  id: string;
  name: string;
  teams: Team[];
}

interface Supervisor {
  id: string;
  firstName: string;
  paternalLastName: string;
}

interface Match {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  scheduledAt: string | null;
  venue: string | null;
  streamUrl: string | null;
  roundLabel: string | null;
  status: string;
  round: string;
  winnerTeamId: string | null;
  homeScore: number;
  awayScore: number;
  supervisorId: string | null;
  supervisor: Supervisor | null;
}

interface Phase {
  id: string;
  name: string;
  type: string;
  startingRound?: string | null;
  hasThirdPlace?: boolean;
}

interface Championship {
  id: string;
  name: string;
  status: string;
  sport: string;
}

type FormState = {
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: string;
  scheduledTime: string;
  venue: string;
  streamUrl: string;
  roundLabel: string;
  supervisorId: string;
};

const emptyForm: FormState = {
  homeTeamId: "", awayTeamId: "",
  scheduledDate: "", scheduledTime: "",
  venue: "", streamUrl: "", roundLabel: "", supervisorId: "",
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

  const [champ, setChamp]         = useState<Championship | null>(null);
  const [phase, setPhase]         = useState<Phase | null>(null);
  const [allTeams, setAllTeams]   = useState<Team[]>([]);
  const [groups, setGroups]       = useState<Group[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Grupo seleccionado para filtrar ("" = todos)
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const [formOpen, setFormOpen]   = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(emptyForm);

  // ── Generación automática de partidos ────────────────────────────────────────
  type BulkMatch = {
    key: string;
    groupName: string;
    homeTeamId: string; homeTeamName: string;
    awayTeamId: string; awayTeamName: string;
    scheduledDate: string; scheduledTime: string;
    venue: string; supervisorId: string;
  };
  const [genOpen, setGenOpen]     = useState(false);
  const [bulkMatches, setBulkMatches] = useState<BulkMatch[]>([]);
  const [bulkSaving, setBulkSaving]   = useState(false);

  const openGenerate = () => {
    const preview: BulkMatch[] = [];
    for (const g of groups) {
      const teams = g.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          preview.push({
            key: `${g.id}-${i}-${j}`,
            groupName: g.name,
            homeTeamId: teams[i].id, homeTeamName: teams[i].name,
            awayTeamId: teams[j].id, awayTeamName: teams[j].name,
            scheduledDate: "", scheduledTime: "",
            venue: "", supervisorId: "",
          });
        }
      }
    }
    setBulkMatches(preview);
    setGenOpen(true);
  };

  const updateBulk = (key: string, field: keyof BulkMatch, value: string) => {
    setBulkMatches((prev) => prev.map((m) => m.key === key ? { ...m, [field]: value } : m));
  };

  const handleConfirmGenerate = async () => {
    setBulkSaving(true);
    try {
      const payload = bulkMatches.map((m) => ({
        homeTeamId:  m.homeTeamId,
        awayTeamId:  m.awayTeamId,
        scheduledAt: m.scheduledDate
          ? new Date(`${m.scheduledDate}T${m.scheduledTime || "00:00"}`).toISOString()
          : null,
        venue:       m.venue.trim() || null,
        roundLabel:  m.groupName,
        supervisorId: m.supervisorId || null,
      }));
      const res = await fetch(
        `/api/championships/${id}/phases/${phaseId}/matches/bulk`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matches: payload }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Partidos generados", description: `${data.created} partidos creados correctamente.` });
      setGenOpen(false);
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo generar", variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Generación de llave (bracket de 4 equipos, solo fútbol) ──────────────────
  const [bracketOpen, setBracketOpen]     = useState(false);
  const [bracketSaving, setBracketSaving] = useState(false);
  const [bracketSemis, setBracketSemis]   = useState({ s1home: "", s1away: "", s2home: "", s2away: "" });

  const openBracket = () => {
    setBracketSemis({ s1home: "", s1away: "", s2home: "", s2away: "" });
    setBracketOpen(true);
  };

  const handleGenerateBracket = async () => {
    // Los equipos son opcionales: la llave puede crearse vacía para el sorteo presencial
    const picks = [bracketSemis.s1home, bracketSemis.s1away, bracketSemis.s2home, bracketSemis.s2away].filter(Boolean);
    if (new Set(picks).size !== picks.length) {
      toast({ title: "No repitas un equipo en la llave", variant: "destructive" });
      return;
    }
    setBracketSaving(true);
    try {
      const res = await fetch(`/api/championships/${id}/phases/${phaseId}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semifinals: [
            { homeTeamId: bracketSemis.s1home || null, awayTeamId: bracketSemis.s1away || null },
            { homeTeamId: bracketSemis.s2home || null, awayTeamId: bracketSemis.s2away || null },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Llave generada", description: "Se crearon semifinales, final y tercer puesto." });
      setBracketOpen(false);
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo generar la llave", variant: "destructive" });
    } finally {
      setBracketSaving(false);
    }
  };

  // ── Corregir resultado de partido de llave ──────────────────────────────────
  const [correctMatch, setCorrectMatch]   = useState<Match | null>(null);
  const [correctForm, setCorrectForm]     = useState({ homeScore: 0, awayScore: 0, winnerId: "" });
  const [correctSaving, setCorrectSaving] = useState(false);

  const openCorrect = (match: Match) => {
    setCorrectMatch(match);
    setCorrectForm({ homeScore: match.homeScore, awayScore: match.awayScore, winnerId: match.winnerTeamId ?? "" });
  };

  const handleCorrect = async () => {
    if (!correctMatch) return;
    const tie = correctForm.homeScore === correctForm.awayScore;
    if (tie && !correctForm.winnerId) {
      toast({ title: "Empate: elige el ganador (penales)", variant: "destructive" });
      return;
    }
    setCorrectSaving(true);
    try {
      const res = await fetch(`/api/championships/${id}/phases/${phaseId}/matches/${correctMatch.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: correctForm.homeScore,
          awayScore: correctForm.awayScore,
          ...(tie ? { winnerTeamId: correctForm.winnerId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Resultado corregido", description: "La llave se actualizó automáticamente." });
      setCorrectMatch(null);
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo corregir", variant: "destructive" });
    } finally {
      setCorrectSaving(false);
    }
  };

  const isLocked = champ?.status === "finalizado";
  const isGroupPhase = phase?.type === "grupos";
  const canBracket =
    !!champ && ["futbol", "futsal", "voleibol"].includes(champ.sport) && phase?.type === "eliminacion";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/championships/${id}`),
        fetch(`/api/championships/${id}/phases`),
        fetch(`/api/championships/${id}/teams`),
        fetch(`/api/championships/${id}/phases/${phaseId}/matches`),
        fetch(`/api/users?role=supervisor`),
      ];

      const [cRes, phRes, tRes, mRes, sRes] = await Promise.all(fetches);
      const [cData, pData, tData, mData, sData] = await Promise.all([
        cRes.json(), phRes.json(), tRes.json(), mRes.json(), sRes.json(),
      ]);

      setChamp(cData);
      const phases = Array.isArray(pData) ? pData : [];
      const currentPhase = phases.find((p: Phase) => p.id === phaseId) ?? null;
      setPhase(currentPhase);
      setAllTeams(Array.isArray(tData) ? tData.map((t: Team) => ({ id: t.id, name: t.name })) : []);
      setMatches(Array.isArray(mData) ? mData : []);
      setSupervisors(Array.isArray(sData) ? sData.map((s: Supervisor & { paternalLastName: string }) => ({
        id: s.id, firstName: s.firstName, paternalLastName: s.paternalLastName,
      })) : []);

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
        return !!m.homeTeamId && !!m.awayTeamId && groupTeamIds.has(m.homeTeamId) && groupTeamIds.has(m.awayTeamId);
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
      homeTeamId:    match.homeTeamId ?? "",
      awayTeamId:    match.awayTeamId ?? "",
      scheduledDate: dt ? dt.toISOString().slice(0, 10) : "",
      scheduledTime: dt ? dt.toTimeString().slice(0, 5) : "",
      venue:         match.venue ?? "",
      streamUrl:     match.streamUrl ?? "",
      roundLabel:    match.roundLabel ?? "",
      supervisorId:  match.supervisorId ?? "",
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
        homeTeamId:   form.homeTeamId,
        awayTeamId:   form.awayTeamId,
        scheduledAt:  buildScheduledAt(),
        venue:        form.venue.trim() || null,
        streamUrl:    form.streamUrl.trim() || null,
        roundLabel:   form.roundLabel.trim() || null,
        supervisorId: form.supervisorId || null,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => router.push(`/admin/campeonatos/${id}/fases`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Fases — {champ?.name}
          </button>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground">PARTIDOS</h1>
          {phase && <p className="text-muted-foreground text-sm mt-1">{phase.name}</p>}
        </div>
        {!isLocked && (
          <div className="flex flex-wrap gap-2">
            {isGroupPhase && groups.length > 0 && matches.length === 0 && (
              <Button variant="outline" onClick={openGenerate} className="gap-1.5">
                <Wand2 className="h-4 w-4" /> Generar partidos
              </Button>
            )}
            {canBracket && (
              <Button variant="outline" onClick={openBracket} className="gap-1.5">
                <Swords className="h-4 w-4" /> Generar llave
              </Button>
            )}
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Agregar partido
            </Button>
          </div>
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
                return !!m.homeTeamId && !!m.awayTeamId && ids.has(m.homeTeamId) && ids.has(m.awayTeamId);
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
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <p className={`truncate text-sm font-medium text-right ${match.homeTeam ? "" : "text-muted-foreground italic"}`}>
                            {match.homeTeam?.name ?? "Por definir"}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {isDone ? (
                              <span className="font-display text-xl tabular-nums">
                                {match.homeScore} — {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm font-medium">vs</span>
                            )}
                          </div>
                          <p className={`truncate text-sm font-medium ${match.awayTeam ? "" : "text-muted-foreground italic"}`}>
                            {match.awayTeam?.name ?? "Por definir"}
                          </p>
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
                          {match.supervisor && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {match.supervisor.firstName} {match.supervisor.paternalLastName}
                            </span>
                          )}
                        </div>

                        <Badge className={`shrink-0 text-xs border-0 ${statusBadge[match.status]}`}>
                          {statusLabel[match.status]}
                        </Badge>

                        <div className="flex gap-1 shrink-0">
                          {/* Corregir resultado: partidos de llave ya finalizados */}
                          {!isLocked && match.status === "finalizado" &&
                            ["semifinal", "final", "tercer_puesto"].includes(match.round) && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700"
                              title="Corregir resultado"
                              onClick={() => openCorrect(match)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

            {/* Link de transmisión */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Radio className="h-3 w-3 text-muted-foreground" /> Link de transmisión
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                type="url"
                placeholder="https://youtube.com/...  ·  facebook.com/...  ·  tiktok.com/..."
                value={form.streamUrl}
                onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Se detecta la plataforma automáticamente. Vacío = sin transmisión.
              </p>
            </div>

            {/* Supervisor */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Eye className="h-3 w-3 text-muted-foreground" /> Supervisor
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select
                value={form.supervisorId || "none"}
                onValueChange={(v) => setForm({ ...form, supervisorId: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.paternalLastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* ── Dialog: Generar partidos automáticamente ─────────────────────────── */}
      <Dialog open={genOpen} onOpenChange={(v) => { setGenOpen(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" /> Generar partidos de grupo
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground px-1">
            Se generarán todos los enfrentamientos (todos contra todos) dentro de cada grupo.
            Configura fecha, hora y sede para cada partido antes de confirmar.
          </p>

          <div className="overflow-y-auto flex-1 space-y-6 pr-1">
            {/* Agrupar por grupo */}
            {Array.from(new Set(bulkMatches.map((m) => m.groupName))).map((groupName) => (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{groupName}</span>
                  <span className="text-xs text-muted-foreground">
                    — {bulkMatches.filter((m) => m.groupName === groupName).length} partidos
                  </span>
                </div>
                <div className="space-y-3">
                  {bulkMatches.filter((m) => m.groupName === groupName).map((m) => (
                    <div key={m.key} className="rounded-lg border border-border/60 bg-card p-3 space-y-3">
                      {/* Equipos */}
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm font-semibold flex-1 text-right">{m.homeTeamName}</span>
                        <span className="text-xs text-muted-foreground font-medium px-2">vs</span>
                        <span className="text-sm font-semibold flex-1">{m.awayTeamName}</span>
                      </div>
                      {/* Config */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> Fecha
                          </Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={m.scheduledDate}
                            onChange={(e) => updateBulk(m.key, "scheduledDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Hora</Label>
                          <Input
                            type="time"
                            className="h-8 text-xs"
                            value={m.scheduledTime}
                            onChange={(e) => updateBulk(m.key, "scheduledTime", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" /> Sede
                          </Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Opcional"
                            value={m.venue}
                            onChange={(e) => updateBulk(m.key, "venue", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Eye className="h-2.5 w-2.5" /> Supervisor
                          </Label>
                          <Select
                            value={m.supervisorId || "none"}
                            onValueChange={(v) => updateBulk(m.key, "supervisorId", v === "none" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {supervisors.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.paternalLastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleConfirmGenerate} disabled={bulkSaving} className="gap-1.5">
              {bulkSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />
              }
              Confirmar y crear {bulkMatches.length} partidos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Generar llave (bracket de 4) ─────────────────────────────── */}
      <Dialog open={bracketOpen} onOpenChange={setBracketOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" /> Generar llave de 4 equipos
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Crea la estructura de la llave. Puedes dejar los cruces <strong>sin asignar</strong> y completarlos
            durante el sorteo presencial (editando cada semifinal). La final y el tercer puesto se crean
            automáticamente: los ganadores avanzan a la final y los perdedores al tercer puesto.
          </p>

          {matches.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700">
              Esta fase ya tiene partidos. Generar la llave los reemplazará.
            </div>
          )}

          <div className="space-y-4 py-1">
            {([
              { label: "Semifinal 1", home: "s1home", away: "s1away" },
              { label: "Semifinal 2", home: "s2home", away: "s2away" },
            ] as const).map((semi) => (
              <div key={semi.label} className="space-y-2 rounded-lg border border-border/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{semi.label}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Select
                    value={bracketSemis[semi.home] || "none"}
                    onValueChange={(v) => setBracketSemis((p) => ({ ...p, [semi.home]: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {allTeams.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          disabled={Object.values(bracketSemis).includes(t.id) && bracketSemis[semi.home] !== t.id}
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs font-medium text-muted-foreground">vs</span>
                  <Select
                    value={bracketSemis[semi.away] || "none"}
                    onValueChange={(v) => setBracketSemis((p) => ({ ...p, [semi.away]: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {allTeams.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          disabled={Object.values(bracketSemis).includes(t.id) && bracketSemis[semi.away] !== t.id}
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleGenerateBracket} disabled={bracketSaving} className="gap-1.5">
              {bracketSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
              Generar llave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Corregir resultado de partido de llave ───────────────────── */}
      <Dialog open={!!correctMatch} onOpenChange={(v) => !v && setCorrectMatch(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" /> Corregir resultado
            </DialogTitle>
          </DialogHeader>
          {correctMatch && (
            <div className="space-y-4 py-1">
              <p className="text-sm text-muted-foreground">
                Ajusta el marcador de <strong>{correctMatch.homeTeam?.name ?? "?"}</strong> vs{" "}
                <strong>{correctMatch.awayTeam?.name ?? "?"}</strong>. Si es semifinal, la final y el
                tercer puesto se recalculan (y se reinician si ya se jugaron con el equipo equivocado).
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-right block">{correctMatch.homeTeam?.name ?? "Local"}</Label>
                  <Input
                    type="number" min={0}
                    value={correctForm.homeScore}
                    onChange={(e) => setCorrectForm((f) => ({ ...f, homeScore: Number(e.target.value) || 0 }))}
                  />
                </div>
                <span className="pb-2 text-muted-foreground">—</span>
                <div className="space-y-1.5">
                  <Label className="text-xs">{correctMatch.awayTeam?.name ?? "Visitante"}</Label>
                  <Input
                    type="number" min={0}
                    value={correctForm.awayScore}
                    onChange={(e) => setCorrectForm((f) => ({ ...f, awayScore: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Empate → elegir ganador (penales) */}
              {correctForm.homeScore === correctForm.awayScore && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Ganador (definición por penales)</Label>
                  <Select value={correctForm.winnerId} onValueChange={(v) => setCorrectForm((f) => ({ ...f, winnerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ganador" /></SelectTrigger>
                    <SelectContent>
                      {correctMatch.homeTeamId && (
                        <SelectItem value={correctMatch.homeTeamId}>{correctMatch.homeTeam?.name}</SelectItem>
                      )}
                      {correctMatch.awayTeamId && (
                        <SelectItem value={correctMatch.awayTeamId}>{correctMatch.awayTeam?.name}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectMatch(null)}>Cancelar</Button>
            <Button onClick={handleCorrect} disabled={correctSaving} className="gap-1.5">
              {correctSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Guardar corrección
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
