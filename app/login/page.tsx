"use client";

import { useState } from "react";
import { Trophy, LogIn, Lock, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { loginAction } from "./actions";

const demoCredentials = [
  { label: "Administrador", email: "admin@champzone.com", password: "admin123" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await loginAction(email.trim().toLowerCase(), password);

      if (result?.error) {
        toast({
          title: "Credenciales inválidas",
          description: result.error,
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (error) {
      // NEXT_REDIRECT es lanzado por signIn cuando el login es exitoso.
      // Hay que re-lanzarlo para que Next.js procese la navegación.
      if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      toast({
        title: "Error",
        description: "Ocurrió un error al iniciar sesión",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-hero)] p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-10 w-10 text-primary" />
            <span className="font-display text-4xl tracking-wide text-foreground">
              CHAMP<span className="text-primary">ZONE</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Ingresa con tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-[var(--shadow-elevated)]">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Iniciar Sesión
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <Card className="border-border/30 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              Credenciales de prueba
            </p>
            <div className="grid gap-2">
              {demoCredentials.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                  }}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-foreground">{u.label}</span>
                    <span className="text-muted-foreground ml-2">{u.email}</span>
                  </div>
                  <LogIn className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
