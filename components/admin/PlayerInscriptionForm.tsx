"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, UserPlus, Camera, Search, Loader2, CheckCircle2, XCircle, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LookupResult {
  source: "local" | "external";
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
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
    paternalLastName: string;
    maternalLastName?: string | null;
    dni: string;
    number: number;
    position: string;
    photoUrl: string | null;
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
  // Campos manuales
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualPaternalLastName, setManualPaternalLastName] = useState("");
  const [manualMaternalLastName, setManualMaternalLastName] = useState("");
  const [manualGender, setManualGender] = useState("");
  // Campos comunes
  const [playerNumber, setPlayerNumber] = useState("");
  const [position, setPosition] = useState("");
  // Foto
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setDni("");
    setLookupResult(null);
    setLookupStatus("idle");
    setManualFirstName("");
    setManualPaternalLastName("");
    setManualMaternalLastName("");
    setManualGender("");
    setPlayerNumber("");
    setPosition("");
    setPhotoPreview(null);
    setPhotoUrl(null);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview inmediato
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Subir al servidor
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUrl(data.url);
    } catch (err: unknown) {
      toast({
        title: "Error al subir foto",
        description: err instanceof Error ? err.message : "Intenta con otra imagen",
        variant: "destructive",
      });
      setPhotoPreview(null);
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
      // Reset input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = () => {
    if (!playerNumber || !position || uploadingPhoto) return false;
    if (!photoUrl) return false; // foto obligatoria
    if (lookupStatus === "found") return true;
    if (lookupStatus === "not_found") return !!manualFirstName.trim() && !!manualPaternalLastName.trim();
    return false;
  };

  const handleSubmit = () => {
    if (!canSubmit()) {
      toast({ title: "Campos incompletos", description: "Completa todos los campos requeridos, incluyendo la foto.", variant: "destructive" });
      return;
    }

    const firstName        = lookupStatus === "found" ? lookupResult!.firstName        : manualFirstName.trim();
    const paternalLastName = lookupStatus === "found" ? lookupResult!.paternalLastName : manualPaternalLastName.trim();
    const maternalLastName = lookupStatus === "found" ? lookupResult!.maternalLastName : manualMaternalLastName.trim() || null;
    const gender           = lookupStatus === "found" ? lookupResult!.gender           : manualGender || null;

    onInscribir({ firstName, paternalLastName, maternalLastName, dni, number: parseInt(playerNumber), position, photoUrl, gender });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                placeholder="Ej: 12345678"
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

          {/* Encontrado en el sistema o RENIEC */}
          {lookupStatus === "found" && lookupResult && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {lookupResult.source === "local" ? "Jugador encontrado en el sistema" : "Datos obtenidos del RENIEC"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nombre completo</p>
                  <p className="font-medium">
                    {[lookupResult.firstName, lookupResult.paternalLastName, lookupResult.maternalLastName].filter(Boolean).join(" ")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">DNI</p>
                  <p className="font-mono">{dni}</p>
                </div>
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
                  <Label>Apellido paterno <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Sánchez" value={manualPaternalLastName} onChange={(e) => setManualPaternalLastName(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Apellido materno <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input placeholder="Ej: Torres" value={manualMaternalLastName} onChange={(e) => setManualMaternalLastName(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
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

          {/* Número, posición y foto */}
          {showFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número de camiseta <span className="text-destructive">*</span></Label>
                  <Input
                    type="number" placeholder="10" min={1} max={99}
                    value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posición <span className="text-destructive">*</span></Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Foto del jugador */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  Foto del jugador <span className="text-destructive">*</span>
                </Label>

                {photoPreview ? (
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-lg border overflow-hidden shrink-0 bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Foto jugador" className="h-full w-full object-cover" />
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {uploadingPhoto ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Subiendo foto...
                        </p>
                      ) : (
                        <p className="text-xs text-primary flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Foto cargada
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={removePhoto}
                          disabled={uploadingPhoto}
                        >
                          <X className="h-3.5 w-3.5" />
                          Quitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors p-6 flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Camera className="h-8 w-8" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Subir foto del jugador</p>
                      <p className="text-xs">JPG, PNG o WEBP · máx. 5MB</p>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                  capture="environment"
                />
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
          <Button onClick={handleSubmit} disabled={!canSubmit()}>
            {uploadingPhoto && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Inscribir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerInscriptionForm;
