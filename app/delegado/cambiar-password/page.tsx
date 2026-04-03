"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Eye, EyeOff, User, Mail, Phone, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CambiarPasswordPage() {
  const { toast } = useToast();

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [newPassword, setNew]     = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa tu nombre completo.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Correo requerido", description: "Ingresa tu correo electrónico real.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirm) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/delegado/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Cuenta configurada", description: "Inicia sesión con tu nuevo correo y contraseña." });
      await signOut({ callbackUrl: "/login" });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo actualizar la cuenta",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="font-display text-3xl tracking-wide text-foreground">
              CHAMP<span className="text-primary">ZONE</span>
            </span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle>Bienvenido — Configura tu cuenta</CardTitle>
            <CardDescription>
              Antes de continuar, registra tus datos reales y establece una contraseña segura.
              Usarás este correo para ingresar al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Datos personales */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tus datos</p>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Nombre completo
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ej: Carlos Mendoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Este será tu nuevo usuario para iniciar sesión.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Teléfono
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: 0991234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Contraseña
                </p>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNew(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNew((v) => !v)}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConf ? "text" : "password"}
                      placeholder="Repite la contraseña"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConf((v) => !v)}
                    >
                      {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando..." : "Completar configuración"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
