"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown,
  GripVertical, Trophy, Users, Swords, Flag, CalendarDays, Shuffle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PhaseType, EliminacionRound } from "@/lib/generated/prisma/enums";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Phase {
  id: string;
  name: string;
  type: PhaseType;
  order: number;
  legsPerMatch: number;
  numGroups: number | null;
  teamsPerGroup: number | null;
  teamsAdvance: number | null;
  startingRound: EliminacionRound | null;
  hasThirdPlace: boolean;
  qualifierCount: number;
}

interface Championship {
  id: string;
  name: string;
  status: string;
}

type FormState = {
  name: string;
  type: PhaseType | "";
  legsPerMatch: number;
  numGroups: number;
  teamsPerGroup: number;
  teamsAdvance: number;
  startingRound: EliminacionRound | "";
  hasThirdPlace: boolean;
};

// ─── Clasificados ─────────────────────────────────────────────────────────────

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  qualifies: boolean;
}

interface GroupStanding {
  groupId: string;
  groupName: string;
  standings: TeamStanding[];
}

interface QualifiersData {
  teamsAdvance: number;
  groups: GroupStanding[];
  savedQualifiers: { teamId: string; teamName: string; groupName: string | null; position: number }[];
}

// ─── Draw result ──────────────────────────────────────────────────────────────

interface DrawResultGrupos {
  type: "grupos";
  seed: string;
  totalTeams: number;
  groups: { id: string; name: string; teams: { id: string; name: string }[] }[];
}

interface DrawResultEliminacion {
  type: "eliminacion";
  seed: string;
  totalTeams: number;
  slots: number;
  byes: number;
  mainRoundLabel: string;
  byeTeams: { id: string; name: string }[];
  matches: { id: string; home: string; away: string }[];
}

type DrawResult = DrawResultGrupos | DrawResultEliminacion;

// ─── Labels ───────────────────────────────────────────────────────────────────

const typeLabels: Record<PhaseType, string> = {
  todos_contra_todos: "Todos contra todos",
  grupos:             "Grupos",
  eliminacion:        "Eliminación directa",
  final:              "Final",
};

const typeIcons: Record<PhaseType, React.ElementType> = {
  todos_contra_todos: Trophy,
  grupos:             Users,
  eliminacion:        Swords,
  final:              Flag,
};

const typeColors: Record<PhaseType, string> = {
  todos_contra_todos: "bg-blue-500/10 text-blue-600",
  grupos:             "bg-violet-500/10 text-violet-600",
  eliminacion:        "bg-orange-500/10 text-orange-600",
  final:              "bg-primary/10 text-primary",
};

const roundLabels: Record<EliminacionRound, string> = {
  dieciseisavos: "Dieciseisavos (32 equipos)",
  octavos:       "Octavos de final (16 equipos)",
  cuartos:       "Cuartos de final (8 equipos)",
  semifinal:     "Semifinal (4 equipos)",
};

const emptyForm: FormState = {
  name: "", type: "", legsPerMatch: 1,
  numGroups: 4, teamsPerGroup: 3, teamsAdvance: 2,
  startingRound: "", hasThirdPlace: false,
};

// ─── PhaseSummary ─────────────────────────────────────────────────────────────

function PhaseSummary({ phase }: { phase: Phase }) {
  const parts: string[] = [];
  if (phase.type === "grupos") {
    if (phase.numGroups) parts.push(`${phase.numGroups} grupos`);
    if (phase.teamsPerGroup) parts.push(`~${phase.teamsPerGroup} equipos c/u`);
    if (phase.teamsAdvance) parts.push(`clasifican ${phase.teamsAdvance}`);
    parts.push(phase.legsPerMatch === 2 ? "ida y vuelta" : "solo ida");
  }
  if (phase.type === "eliminacion") {
    if (phase.startingRound) parts.push(roundLabels[phase.startingRound].split(" ")[0]);
    parts.push(phase.legsPerMatch === 2 ? "ida y vuelta" : "eliminación directa");
    if (phase.hasThirdPlace) parts.push("3er puesto");
  }
  if (phase.type === "todos_contra_todos") {
    parts.push(phase.legsPerMatch === 2 ? "ida y vuelta" : "solo ida");
  }
  if (phase.type === "final" && phase.hasThirdPlace) parts.push("con 3er puesto");
  return parts.length > 0 ? (
    <p className="text-xs text-muted-foreground mt-0.5">{parts.join(" · ")}</p>
  ) : null;
}

// ─── DrawResultDialog ─────────────────────────────────────────────────────────

function DrawResultDialog({ result, onClose }: { result: DrawResult; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Sorteo realizado</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-lg bg-muted/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-1">Semilla pública (verificable)</p>
            <p className="font-mono text-sm font-medium tracking-widest">{result.seed}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reproducible con Fisher-Yates / mulberry32 usando esta semilla.
            </p>
          </div>

          {result.type === "grupos" && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{result.totalTeams} equipos en {result.groups.length} grupos</p>
              <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                {result.groups.map((g) => (
                  <div key={g.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{g.name}</p>
                    {g.teams.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm py-0.5">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span>{t.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.type === "eliminacion" && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {result.totalTeams} equipos → bracket de {result.slots}
                {result.byes > 0 && ` (${result.byes} pase${result.byes > 1 ? "s" : ""} directo${result.byes > 1 ? "s" : ""})`}
              </p>
              {result.byes > 0 && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">Pases directos a {result.mainRoundLabel}</p>
                  {result.byeTeams.map((t) => (
                    <p key={t.id} className="text-sm text-blue-800">• {t.name}</p>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {result.byes > 0 ? "Ronda previa" : result.mainRoundLabel}
                </p>
                {result.matches.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm py-0.5">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="font-medium">{m.home}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span className="font-medium">{m.away}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ClasificadosDialog ───────────────────────────────────────────────────────

function ClasificadosDialog({
  phaseId,
  championshipId,
  phaseName,
  onClose,
  onSaved,
}: {
  phaseId: string;
  championshipId: string;
  phaseName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<QualifiersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // teamId → checked
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/championships/${championshipId}/phases/${phaseId}/qualifiers`)
      .then((r) => r.json())
      .then((d: QualifiersData) => {
        setData(d);
        // Pre-seleccionar: guardados > calculados automáticamente
        const init: Record<string, boolean> = {};
        if (d.savedQualifiers.length > 0) {
          d.savedQualifiers.forEach((q) => { init[q.teamId] = true; });
        } else {
          d.groups.forEach((g) => {
            g.standings.forEach((s) => { init[s.teamId] = s.qualifies; });
          });
        }
        setSelected(init);
      })
      .finally(() => setLoading(false));
  }, [phaseId, championshipId]);

  const toggle = (teamId: string) =>
    setSelected((prev) => ({ ...prev, [teamId]: !prev[teamId] }));

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const qualifiers = data.groups.flatMap((g) =>
        g.standings
          .filter((s) => selected[s.teamId])
          .map((s, i) => ({ teamId: s.teamId, groupName: g.groupName, position: i + 1 }))
      );
      const res = await fetch(
        `/api/championships/${championshipId}/phases/${phaseId}/qualifiers`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qualifiers }) }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: `${result.saved} clasificados guardados` });
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clasificados — {phaseName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Error al cargar datos</p>
        ) : data.groups.length === 0 ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700">
            No hay grupos configurados. Realiza primero el sorteo de grupos.
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Se calculan automáticamente según puntos → diferencia de goles → goles a favor.
              Puedes ajustar manualmente en caso de empates especiales.
            </p>

            {data.groups.map((group) => (
              <div key={group.groupId} className="rounded-lg border border-border/60 overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 border-b border-border/40">
                  <p className="text-xs font-semibold uppercase tracking-wide">{group.groupName}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left px-3 py-1.5 w-6"></th>
                      <th className="text-left px-2 py-1.5">Equipo</th>
                      <th className="text-center px-2 py-1.5 w-8">PJ</th>
                      <th className="text-center px-2 py-1.5 w-8">G</th>
                      <th className="text-center px-2 py-1.5 w-8">E</th>
                      <th className="text-center px-2 py-1.5 w-8">P</th>
                      <th className="text-center px-2 py-1.5 w-8">GF</th>
                      <th className="text-center px-2 py-1.5 w-8">GC</th>
                      <th className="text-center px-2 py-1.5 w-8">DG</th>
                      <th className="text-center px-2 py-1.5 w-10 font-bold">PTS</th>
                      <th className="text-center px-3 py-1.5 w-10">Pasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((s, idx) => (
                      <tr
                        key={s.teamId}
                        className={`border-b border-border/20 last:border-0 ${selected[s.teamId] ? "bg-green-500/5" : ""}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-2 font-medium">{s.teamName}</td>
                        <td className="text-center px-2 py-2">{s.played}</td>
                        <td className="text-center px-2 py-2">{s.won}</td>
                        <td className="text-center px-2 py-2">{s.drawn}</td>
                        <td className="text-center px-2 py-2">{s.lost}</td>
                        <td className="text-center px-2 py-2">{s.gf}</td>
                        <td className="text-center px-2 py-2">{s.ga}</td>
                        <td className={`text-center px-2 py-2 ${s.gd > 0 ? "text-green-600" : s.gd < 0 ? "text-red-500" : ""}`}>
                          {s.gd > 0 ? `+${s.gd}` : s.gd}
                        </td>
                        <td className="text-center px-2 py-2 font-bold">{s.points}</td>
                        <td className="text-center px-3 py-2">
                          <Checkbox
                            checked={!!selected[s.teamId]}
                            onCheckedChange={() => toggle(s.teamId)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <p className="text-sm text-muted-foreground mr-auto">{totalSelected} clasificados seleccionados</p>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading || totalSelected === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar clasificados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DrawConfirmDialog ────────────────────────────────────────────────────────

function DrawConfirmDialog({
  phase,
  championshipId,
  previousGroupPhases,
  onCancel,
  onConfirm,
}: {
  phase: Phase;
  championshipId: string;
  previousGroupPhases: Phase[];
  onCancel: () => void;
  onConfirm: (teamIds?: string[]) => void;
}) {
  const [source, setSource] = useState<"all" | string>("all");
  const [qualifiersMap, setQualifiersMap] = useState<Record<string, { teamId: string; teamName: string }[]>>({});

  useEffect(() => {
    // Cargar clasificados de fases de grupos anteriores
    previousGroupPhases.forEach((p) => {
      if (p.qualifierCount > 0) {
        fetch(`/api/championships/${championshipId}/phases/${p.id}/qualifiers`)
          .then((r) => r.json())
          .then((d: QualifiersData) => {
            const teams = d.savedQualifiers.map((q) => ({ teamId: q.teamId, teamName: q.teamName }));
            setQualifiersMap((prev) => ({ ...prev, [p.id]: teams }));
          });
      }
    });
  }, [previousGroupPhases, championshipId]);

  const selectedTeams = source === "all" ? undefined : qualifiersMap[source];

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sorteo — {phase.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {phase.type === "eliminacion" && previousGroupPhases.some((p) => p.qualifierCount > 0) && (
            <div className="space-y-2">
              <Label className="text-sm">¿Qué equipos participan en este sorteo?</Label>
              <RadioGroup value={source} onValueChange={setSource} className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                  <RadioGroupItem value="all" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Todos los equipos del campeonato</p>
                    <p className="text-xs text-muted-foreground">Se incluyen todos los equipos activos</p>
                  </div>
                </label>
                {previousGroupPhases
                  .filter((p) => p.qualifierCount > 0)
                  .map((p) => (
                    <label key={p.id} className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                      <RadioGroupItem value={p.id} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Clasificados de "{p.name}"</p>
                        <p className="text-xs text-muted-foreground">{p.qualifierCount} equipos clasificados</p>
                      </div>
                    </label>
                  ))}
              </RadioGroup>
            </div>
          )}

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-700">
            {phase.type === "grupos"
              ? "Los grupos existentes serán reemplazados si ya existe un sorteo previo."
              : "Los partidos existentes de esta fase serán eliminados y reemplazados."}
          </div>

          {source !== "all" && qualifiersMap[source] && (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Equipos que entrarán al sorteo ({qualifiersMap[source].length})
              </p>
              {qualifiersMap[source].map((t) => (
                <p key={t.teamId} className="text-sm py-0.5">• {t.teamName}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(selectedTeams?.map((t) => t.teamId))}
            disabled={source !== "all" && !qualifiersMap[source]}
          >
            <Shuffle className="h-4 w-4 mr-1.5" /> Realizar sorteo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [champ, setChamp] = useState<Championship | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Sorteo
  const [drawPhase, setDrawPhase] = useState<Phase | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);

  // Clasificados
  const [clasificadosPhase, setClasificadosPhase] = useState<Phase | null>(null);

  const isLocked = champ?.status === "en_curso" || champ?.status === "finalizado";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/championships/${id}`),
        fetch(`/api/championships/${id}/phases`),
      ]);
      setChamp(await cRes.json());
      const pData = await pRes.json();
      if (!Array.isArray(pData)) { setPhases([]); return; }

      // Enriquecer con conteo de clasificados
      const enriched = await Promise.all(
        pData.map(async (p: Omit<Phase, "qualifierCount">) => {
          if (p.type !== "grupos") return { ...p, qualifierCount: 0 };
          try {
            const r = await fetch(`/api/championships/${id}/phases/${p.id}/qualifiers`);
            const d: QualifiersData = await r.json();
            return { ...p, qualifierCount: d.savedQualifiers.length };
          } catch {
            return { ...p, qualifierCount: 0 };
          }
        })
      );
      setPhases(enriched);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setEditPhase(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (phase: Phase) => {
    setEditPhase(phase);
    setForm({
      name: phase.name, type: phase.type, legsPerMatch: phase.legsPerMatch,
      numGroups: phase.numGroups ?? 4, teamsPerGroup: phase.teamsPerGroup ?? 3,
      teamsAdvance: phase.teamsAdvance ?? 2,
      startingRound: phase.startingRound ?? "", hasThirdPlace: phase.hasThirdPlace,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.type) {
      toast({ title: "Nombre y tipo son requeridos", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), type: form.type, legsPerMatch: form.legsPerMatch,
        order: editPhase?.order ?? phases.length + 1,
        numGroups:     form.type === "grupos" ? form.numGroups : null,
        teamsPerGroup: form.type === "grupos" ? form.teamsPerGroup : null,
        teamsAdvance:  form.type === "grupos" ? form.teamsAdvance : null,
        startingRound: form.type === "eliminacion" ? (form.startingRound || null) : null,
        hasThirdPlace: (form.type === "eliminacion" || form.type === "final") ? form.hasThirdPlace : false,
      };
      const res = await fetch(
        editPhase ? `/api/championships/${id}/phases/${editPhase.id}` : `/api/championships/${id}/phases`,
        { method: editPhase ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: editPhase ? "Fase actualizada" : "Fase creada" });
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
      const res = await fetch(`/api/championships/${id}/phases/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Fase eliminada" });
      fetchAll();
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    } finally { setDeleteId(null); }
  };

  const movePhase = async (phase: Phase, direction: "up" | "down") => {
    const sorted = [...phases].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((p) => p.id === phase.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updated = sorted.map((p, i) => {
      if (i === idx) return { ...p, order: sorted[swapIdx].order };
      if (i === swapIdx) return { ...p, order: sorted[idx].order };
      return p;
    });
    setPhases(updated);
    await fetch(`/api/championships/${id}/phases`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated.map(({ id: pid, order }) => ({ id: pid, order }))),
    });
  };

  const handleDraw = async (teamIds?: string[]) => {
    if (!drawPhase) return;
    setDrawLoading(true);
    setDrawPhase(null);
    try {
      const res = await fetch(`/api/championships/${id}/phases/${drawPhase.id}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamIds ? { teamIds } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDrawResult(data as DrawResult);
      fetchAll();
    } catch (e: unknown) {
      toast({ title: "Error en el sorteo", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setDrawLoading(false);
    }
  };

  const sorted = [...phases].sort((a, b) => a.order - b.order);

  // Fases de grupos anteriores con clasificados (para el draw de eliminación)
  const groupPhasesWithQualifiers = (targetPhase: Phase) =>
    sorted.filter((p) => p.type === "grupos" && p.order < targetPhase.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/admin/campeonatos")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Campeonatos
          </button>
          <h1 className="font-display text-4xl text-foreground">FASES</h1>
          {champ && <p className="text-muted-foreground text-sm mt-1">{champ.name}</p>}
        </div>
        {!isLocked && (
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Agregar fase
          </Button>
        )}
      </div>

      {isLocked && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700">
          El campeonato está en curso o finalizado. Las fases no se pueden modificar.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">Sin fases configuradas</p>
            <p className="text-sm text-muted-foreground">Agrega las fases que compondrán este campeonato.</p>
            {!isLocked && (
              <Button onClick={openCreate} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Agregar primera fase
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((phase, idx) => {
            const Icon = typeIcons[phase.type];
            const canDraw = !isLocked && (phase.type === "grupos" || phase.type === "eliminacion");
            return (
              <Card key={phase.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Reordenar */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button disabled={idx === 0 || isLocked} onClick={() => movePhase(phase, "up")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <button disabled={idx === sorted.length - 1 || isLocked} onClick={() => movePhase(phase, "down")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {idx + 1}
                  </div>

                  <div className={`rounded-lg p-2 shrink-0 ${typeColors[phase.type]}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{phase.name}</p>
                    <PhaseSummary phase={phase} />
                    {phase.type === "grupos" && phase.qualifierCount > 0 && (
                      <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {phase.qualifierCount} clasificados confirmados
                      </p>
                    )}
                  </div>

                  <Badge variant="outline" className="hidden sm:flex shrink-0 text-xs">
                    {typeLabels[phase.type]}
                  </Badge>

                  {/* Acciones */}
                  <div className="flex gap-1 shrink-0">
                    {/* Clasificados — solo fases de grupos */}
                    {phase.type === "grupos" && (
                      <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setClasificadosPhase(phase)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Clasificados
                      </Button>
                    )}

                    {/* Sorteo */}
                    {canDraw && (
                      <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={drawLoading}
                        onClick={() => setDrawPhase(phase)}
                      >
                        {drawLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                        Sorteo
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver partidos" asChild>
                      <Link href={`/admin/campeonatos/${id}/fases/${phase.id}/partidos`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Link>
                    </Button>

                    {!isLocked && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(phase)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(phase.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar fase */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditPhase(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editPhase ? "Editar fase" : "Nueva fase"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Fase de Grupos, Cuartos de Final..."
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PhaseType })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.type === "todos_contra_todos" && (
              <div className="space-y-2">
                <Label>Modalidad</Label>
                <Select value={String(form.legsPerMatch)} onValueChange={(v) => setForm({ ...form, legsPerMatch: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Solo ida — cada par juega una vez</SelectItem>
                    <SelectItem value="2">Ida y vuelta — juegan en casa y de visitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type === "grupos" && (
              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuración de grupos</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">N° de grupos</Label>
                    <Input type="number" min={1} value={form.numGroups}
                      onChange={(e) => setForm({ ...form, numGroups: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Equipos por grupo</Label>
                    <Input type="number" min={2} value={form.teamsPerGroup}
                      onChange={(e) => setForm({ ...form, teamsPerGroup: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground">Referencial — el sorteo distribuye según el total real</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Clasifican por grupo</Label>
                    <Input type="number" min={1} value={form.teamsAdvance}
                      onChange={(e) => setForm({ ...form, teamsAdvance: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Modalidad</Label>
                  <Select value={String(form.legsPerMatch)} onValueChange={(v) => setForm({ ...form, legsPerMatch: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Solo ida</SelectItem>
                      <SelectItem value="2">Ida y vuelta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.type === "eliminacion" && (
              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuración del bracket</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ronda inicial del bracket</Label>
                  <Select value={form.startingRound} onValueChange={(v) => setForm({ ...form, startingRound: v as EliminacionRound })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ronda" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roundLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si hay menos equipos que los requeridos, el sorteo asigna pases directos automáticamente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Modalidad</Label>
                  <Select value={String(form.legsPerMatch)} onValueChange={(v) => setForm({ ...form, legsPerMatch: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Eliminación directa (un partido)</SelectItem>
                      <SelectItem value="2">Ida y vuelta (dos partidos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Incluir partido por 3er puesto</Label>
                  <Switch checked={form.hasThirdPlace} onCheckedChange={(v) => setForm({ ...form, hasThirdPlace: v })} />
                </div>
              </div>
            )}

            {form.type === "final" && (
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Incluir partido por 3er puesto</Label>
                  <Switch checked={form.hasThirdPlace} onCheckedChange={(v) => setForm({ ...form, hasThirdPlace: v })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editPhase ? "Guardar cambios" : "Crear fase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sorteo con selector de equipos */}
      {drawPhase && (
        <DrawConfirmDialog
          phase={drawPhase}
          championshipId={id}
          previousGroupPhases={groupPhasesWithQualifiers(drawPhase)}
          onCancel={() => setDrawPhase(null)}
          onConfirm={handleDraw}
        />
      )}

      {/* Dialog clasificados */}
      {clasificadosPhase && (
        <ClasificadosDialog
          phaseId={clasificadosPhase.id}
          championshipId={id}
          phaseName={clasificadosPhase.name}
          onClose={() => setClasificadosPhase(null)}
          onSaved={fetchAll}
        />
      )}

      {/* Resultado del sorteo */}
      {drawResult && (
        <DrawResultDialog result={drawResult} onClose={() => setDrawResult(null)} />
      )}

      {/* Confirmar eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta fase?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la fase y todos los partidos asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
