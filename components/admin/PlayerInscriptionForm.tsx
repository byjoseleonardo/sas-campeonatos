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
import { lookupDni, type CitizenRecord } from "@/lib/dniDatabase";
import { useToast } from "@/hooks/use-toast";

interface PlayerInscriptionFormProps {
  teamName: string;
  championshipName: string;
  playersCount: number;
  maxPlayers: number;
  positionOptions: string[];
  onInscribir: (player: {
    name: string;
    dni: string;
    number: number;
    position: string;
    photoUrl: string | null;
    birthDate?: string;
    gender?: string;
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
  const [lookupResult, setLookupResult] = useState<CitizenRecord | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [playerNumber, setPlayerNumber] = useState("");
  const [position, setPosition] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setDni("");
    setLookupResult(null);
    setLookupStatus("idle");
    setPlayerNumber("");
    setPosition("");
    setPhotoPreview(null);
  };

  const handleDniSearch = async () => {
    if (dni.length < 8) {
      toast({ title: "DNI inválido", description: "Ingresa al menos 8 dígitos.", variant: "destructive" });
      return;
    }
    setLookupStatus("loading");
    const result = await lookupDni(dni);
    if (result) {
      setLookupResult(result);
      setLookupStatus("found");
    } else {
      setLookupResult(null);
      setLookupStatus("not_found");
    }
  };

  const handleDniKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDniSearch();
    }
  };

  const handlePhotoCapture = () => {
    setPhotoPreview(
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxMiI+Rm90bzwvdGV4dD48L3N2Zz4="
    );
    toast({ title: "Foto capturada", description: "La foto del jugador ha sido tomada (demo)." });
  };

  const handleSubmit = () => {
    if (!lookupResult || !position || !playerNumber) {
      toast({ title: "Campos incompletos", description: "Completa todos los campos requeridos.", variant: "destructive" });
      return;
    }
    onInscribir({
      name: lookupResult.fullName,
      dni: lookupResult.dni,
      number: parseInt(playerNumber),
      position,
      photoUrl: photoPreview,
      birthDate: lookupResult.birthDate,
      gender: lookupResult.gender,
    });
    resetForm();
    setOpen(false);
  };

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
                  if (lookupStatus !== "idle") {
                    setLookupStatus("idle");
                    setLookupResult(null);
                  }
                }}
                onKeyDown={handleDniKeyDown}
                maxLength={13}
                className="font-mono"
              />
              <Button
                variant="secondary"
                onClick={handleDniSearch}
                disabled={lookupStatus === "loading" || dni.length < 8}
                className="shrink-0 gap-1.5"
              >
                {lookupStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Consultar
              </Button>
            </div>
          </div>

          {lookupStatus === "found" && lookupResult && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Ciudadano encontrado</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nombre completo</p>
                  <p className="font-medium text-foreground">{lookupResult.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha de nacimiento</p>
                  <p className="font-medium text-foreground">{lookupResult.birthDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DNI</p>
                  <p className="font-mono text-foreground">{lookupResult.dni}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Género</p>
                  <p className="font-medium text-foreground">{lookupResult.gender === "M" ? "Masculino" : "Femenino"}</p>
                </div>
              </div>
            </div>
          )}

          {lookupStatus === "not_found" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">No se encontró el DNI</p>
                <p className="text-xs text-muted-foreground">Verifica el número e intenta de nuevo</p>
              </div>
            </div>
          )}

          {lookupStatus === "found" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número de camiseta</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    min={1}
                    max={99}
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
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
          <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={lookupStatus !== "found" || !position || !playerNumber}>
            Inscribir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerInscriptionForm;
