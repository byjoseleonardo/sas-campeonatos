"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, UserPlus, Camera, Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LookupResult {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
}

interface PlayerInscriptionFormProps {
  teamName: string;
  championshipName: string;
  playersCount: number;
  maxPlayers: number;
  positionOptions: string[];
  onInscribir: (player: {
    firstName: string;
    lastName: string;
    dni: string;
    number: number;
    position: string;
    photoUrl: string | null;
    birthDate?: string | null;
    gender?: string | null;
  }) => void;
}

const PlayerInscriptionForm = ({
  teamName,
  championshipName,
  playersCount,
  maxPlayers,
  positionOptions,
  onInscribir,
}: PlayerInscriptionFormProps) => {
  const [open, setOpen] = useState(false);
  const [dni, setDni] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  // Campos manuales (cuando el jugador no está en el sistema)
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");
  const [manualBirthDate, setManualBirthDate] = useState("");
  const [manualGender, setManualGender] = useState("");
  // Campos comunes
  const [playerNumber, setPlayerNumber] = useState("");
  const [position, setPosition] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setDni("");
    setLookupResult(null);
    setLookupStatus("idle");
    setManualFirstName("");
    setManualLastName("");
    setManualBirthDate("");
    setManualGender("");
    setPlayerNumber("");
    setPosition("");
    setPhotoPreview(null);
  };

  const handleDniSearch = async () => {
    if (dni.length < 6) {
      toast({ title: "DNI inválido", description: "Ingresa al menos 6 dígitos.", variant: "destructive" });
      return;
    }
    setLookupStatus("loading");
    try {
      const res = await fetch(`/api/players/lookup?dni=${encodeURIComponent(dni)}`);
      const data = await res.json();
      if (data) {
        setLookupResult(data);
        setLookupStatus("found");
      } else {
        setLookupResult(null);
        setLookupStatus("not_found");
      }
    } catch {
      setLookupResult(null);
      setLookupStatus("not_found");
    }
  };

  const handleDniKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleDniSearch(); }
  };

  const handlePhotoCapture = () => {
    setPhotoPreview(
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxMiI+Rm90bzwvdGV4dD48L3N2Zz4="
    );
    toast({ title: "Foto capturada", description: "La foto del jugador ha sido tomada (demo)." });
  };

  const canSubmit = () => {
    if (!playerNumber || !position) return false;
    if (lookupStatus === "found") return true;
    if (lookupStatus === "not_found") return !!manualFirstName.trim() && !!manualLastName.trim();
    return false;
  };

  const handleSubmit = () => {
    if (!canSubmit()) {
      toast({ title: "Campos incompletos", description: "Completa todos los campos requeridos.", variant: "destructive" });
      return;
    }

    const firstName = lookupStatus === "found" ? lookupResult!.firstName : manualFirstName.trim();
    const lastName  = lookupStatus === "found" ? lookupResult!.lastName  : manualLastName.trim();
    const birthDate = lookupStatus === "found" ? lookupResult!.birthDate : manualBirthDate || null;
    const gender    = lookupStatus === "found" ? lookupResult!.gender    : manualGender || null;

    onInscribir({ firstName, lastName, dni, number: parseInt(playerNumber), position, photoUrl: photoPreview, birthDate, gender });
    resetForm();
    setOpen(false);
  };

  const showFields = lookupStatus === "found" || lookupStatus === "not_found";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Inscribir Jugador
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Inscribir Jugador
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">

          {/* DNI Lookup */}
          <div className="space-y-2">
            <Label>Cédula / DNI</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: 0901234567"
                value={dni}
                onChange={(e) => {
                  setDni(e.target.value.replace(/\D/g, ""));
                  if (lookupStatus !== "idle") { setLookupStatus("idle"); setLookupResult(null); }
                }}
                onKeyDown={handleDniKeyDown}
                maxLength={13}
                className="font-mono"
              />
              <Button
                variant="secondary"
                onClick={handleDniSearch}
                disabled={lookupStatus === "loading" || dni.length < 6}
                className="shrink-0 gap-1.5"
              >
                {lookupStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar
              </Button>
            </div>
          </div>

          {/* Encontrado en el sistema */}
          {lookupStatus === "found" && lookupResult && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Jugador encontrado en el sistema</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nombre</p>
                  <p className="font-medium">{lookupResult.firstName} {lookupResult.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DNI</p>
                  <p className="font-mono">{dni}</p>
                </div>
                {lookupResult.birthDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha de nacimiento</p>
                    <p className="font-medium">
                      {new Date(lookupResult.birthDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
                {lookupResult.gender && (
                  <div>
                    <p className="text-muted-foreground text-xs">Género</p>
                    <p className="font-medium">{lookupResult.gender === "M" ? "Masculino" : "Femenino"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No encontrado — ingreso manual */}
          {lookupStatus === "not_found" && (
            <>
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Jugador no encontrado</p>
                  <p className="text-xs text-muted-foreground">Ingresa los datos manualmente para registrarlo</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nombre <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Roberto" value={manualFirstName} onChange={(e) => setManualFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Sánchez" value={manualLastName} onChange={(e) => setManualLastName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={manualBirthDate} onChange={(e) => setManualBirthDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select value={manualGender} onValueChange={setManualGender}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Número y posición (visible cuando ya se hizo lookup) */}
          {showFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número de camiseta</Label>
                  <Input
                    type="number" placeholder="10" min={1} max={99}
                    value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Foto jugador" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" onClick={handlePhotoCapture} className="gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    {photoPreview ? "Retomar foto" : "Tomar foto"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Foto opcional para identificación</p>
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Equipo: {teamName}</p>
            <p>Campeonato: {championshipName}</p>
            <p>Jugadores registrados: {playersCount} / {maxPlayers}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit()}>Inscribir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerInscriptionForm;
