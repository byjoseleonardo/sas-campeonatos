"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CheckCircle2, Play, Square, UserCheck, AlertTriangle,
  Minus as MinusIcon, Plus, Shield, XCircle, Clock,
} from "lucide-react";
import { mockPlayers, type Player } from "@/lib/adminMockData";
import { championships, teams } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface PlanillaPlayer {
  player: Player;
  validated: boolean;
  photoUrl: string;
  goals: number;
  yellowCards: number;
  redCards: number;
}

export default function AdminTecnicosPage() {
  const [selectedChampionship, setSelectedChampionship] = useState("1");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("validacion");
  const [matchStarted, setMatchStarted] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [planilla, setPlanilla] = useState<PlanillaPlayer[]>(() =>
    mockPlayers
      .filter((p) => p.teamId === "1" && p.championshipId === "1" && p.status === "inscrito")
      .map((p) => ({
        player: p,
        validated: false,
        photoUrl: "",
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      }))
  );

  const validatedCount = planilla.filter((p) => p.validated).length;
  const totalPlayers = planilla.length;

  // Camera functions
  const startCamera = useCallback(async (playerId: string) => {
    setCurrentPlayerId(playerId);
    setCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Verifica los permisos.",
        variant: "destructive",
      });
      setCameraOpen(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setCurrentPlayerId(null);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !currentPlayerId) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL("image/jpeg", 0.8);

      setPlanilla((prev) =>
        prev.map((p) =>
          p.player.id === currentPlayerId
            ? { ...p, validated: true, photoUrl: photoData }
            : p
        )
      );

      toast({
        title: "Jugador validado",
        description: "La foto fue capturada y el jugador pasa a la planilla.",
      });
    }

    stopCamera();
  }, [currentPlayerId, stopCamera, toast]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOpen, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleStartMatch = () => {
    setMatchStarted(true);
    toast({ title: "¡Partido iniciado!", description: "El cronómetro ha comenzado." });
  };

  const handleEndMatch = () => {
    setMatchStarted(false);
    toast({ title: "Partido finalizado", description: "Los resultados han sido registrados (demo)." });
  };

  const updateStat = (playerId: string, stat: "goals" | "yellowCards" | "redCards", delta: number) => {
    setPlanilla((prev) =>
      prev.map((p) =>
        p.player.id === playerId
          ? { ...p, [stat]: Math.max(0, p[stat] + delta) }
          : p
      )
    );
  };

  const totalGoals = planilla.reduce((acc, p) => acc + p.goals, 0);
  const totalYellows = planilla.reduce((acc, p) => acc + p.yellowCards, 0);
  const totalReds = planilla.reduce((acc, p) => acc + p.redCards, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">TÉCNICO</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Valida jugadores, administra la planilla y registra estadísticas del partido
        </p>
      </div>

      {/* Selectors */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Campeonato</Label>
          <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {championships.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Partido</Label>
          <Select value={selectedMatch || ""} onValueChange={setSelectedMatch}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar partido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match1">Águilas FC vs Leones SC — J3</SelectItem>
              <SelectItem value="match2">Rayos FC vs Truenos SC — J3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Match control */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-lg">Águilas FC</p>
              <p className="text-xs text-muted-foreground">Local</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-3xl text-primary">{totalGoals}</span>
              <span className="text-muted-foreground text-lg">–</span>
              <span className="font-display text-3xl text-muted-foreground">0</span>
            </div>
            <div className="text-center">
              <p className="font-display text-lg">Leones SC</p>
              <p className="text-xs text-muted-foreground">Visitante</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {matchStarted ? (
              <>
                <Badge className="bg-destructive/15 text-destructive animate-pulse gap-1">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  EN VIVO
                </Badge>
                <Button variant="destructive" size="sm" onClick={handleEndMatch} className="gap-1.5">
                  <Square className="h-3.5 w-3.5" /> Finalizar
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleStartMatch} className="gap-1.5" disabled={validatedCount === 0}>
                <Play className="h-3.5 w-3.5" /> Iniciar Partido
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats summary */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display">{validatedCount}/{totalPlayers}</p>
              <p className="text-[10px] text-muted-foreground">Validados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-display">{totalGoals}</p>
              <p className="text-[10px] text-muted-foreground">Goles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xl font-display">{totalYellows}</p>
              <p className="text-[10px] text-muted-foreground">Amarillas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-2.5 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-display">{totalReds}</p>
              <p className="text-[10px] text-muted-foreground">Rojas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="validacion" className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Validación
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* VALIDACIÓN TAB */}
        <TabsContent value="validacion" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haz clic en un jugador para tomar su foto con la cámara y validar su ingreso a la planilla.
          </p>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planilla.map((entry) => (
                    <TableRow key={entry.player.id} className={entry.validated ? "bg-primary/5" : ""}>
                      <TableCell className="font-display text-lg text-muted-foreground">
                        {entry.player.number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0">
                            {entry.photoUrl ? (
                              <img
                                src={entry.photoUrl}
                                alt={entry.player.name}
                                className="h-9 w-9 rounded-full object-cover border-2 border-primary"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-display text-sm">
                                {entry.player.name.charAt(0)}
                              </div>
                            )}
                            {entry.validated && (
                              <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-primary bg-background rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{entry.player.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.player.cedula}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{entry.player.position}</TableCell>
                      <TableCell>
                        {entry.validated ? (
                          <Badge className="bg-primary/15 text-primary gap-1">
                            <CheckCircle2 className="h-3 w-3" /> En planilla
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" /> Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!entry.validated && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => startCamera(entry.player.id)}
                          >
                            <Camera className="h-3.5 w-3.5" /> Validar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTADÍSTICAS TAB */}
        <TabsContent value="estadisticas" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registra goles, tarjetas amarillas y rojas para los jugadores validados en la planilla.
          </p>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Amarillas</TableHead>
                    <TableHead className="text-center">Rojas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planilla
                    .filter((p) => p.validated)
                    .map((entry) => (
                      <TableRow key={entry.player.id}>
                        <TableCell className="font-display text-lg text-muted-foreground">
                          {entry.player.number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entry.photoUrl && (
                              <img src={entry.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                            )}
                            <span className="text-sm font-medium">{entry.player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "goals", -1)}
                              disabled={!matchStarted}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-display text-lg">{entry.goals}</span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "goals", 1)}
                              disabled={!matchStarted}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "yellowCards", -1)}
                              disabled={!matchStarted}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-display text-lg">{entry.yellowCards}</span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "yellowCards", 1)}
                              disabled={!matchStarted}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "redCards", -1)}
                              disabled={!matchStarted}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-display text-lg">{entry.redCards}</span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => updateStat(entry.player.id, "redCards", 1)}
                              disabled={!matchStarted}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {planilla.filter((p) => p.validated).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay jugadores validados aún
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ve a la pestaña de Validación para agregar jugadores a la planilla
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Camera Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Validar Jugador
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {currentPlayerId && (
              <p className="text-sm text-muted-foreground">
                Jugador: <span className="font-medium text-foreground">
                  {planilla.find((p) => p.player.id === currentPlayerId)?.player.name}
                </span>
              </p>
            )}
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={stopCamera}>Cancelar</Button>
              <Button onClick={capturePhoto} className="gap-1.5">
                <Camera className="h-4 w-4" /> Capturar Foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
