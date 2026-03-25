"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, LogIn, Lock, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const mockUsers = [
  { email: "admin@champzone.com", password: "admin123", role: "admin", name: "Carlos Administrador" },
  { email: "supervisor@champzone.com", password: "super123", role: "supervisor", name: "María Supervisora" },
  { email: "tecnico@champzone.com", password: "tec123", role: "tecnico", name: "Jorge Técnico" },
  { email: "delegado@champzone.com", password: "del123", role: "delegado", name: "Ana Delegada" },
];

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  supervisor: "/admin/supervisores",
  tecnico: "/admin/tecnicos",
  delegado: "/delegado/inscripcion",
};

const roleLabels: Record<string, string> = {
  admin: "Organizador",
  supervisor: "Supervisor",
  tecnico: "Técnico",
  delegado: "Delegado",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const user = mockUsers.find(
        (u) => u.email === email.trim().toLowerCase() && u.password === password
      );

      if (user) {
        toast({
          title: `Bienvenido, ${user.name}`,
          description: `Ingresando como ${roleLabels[user.role]}`,
        });
        router.push(roleRoutes[user.role]);
      } else {
        toast({
          title: "Credenciales inválidas",
          description: "Verifica tu correo y contraseña",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
        <Card>
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
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              Credenciales de prueba
            </p>
            <div className="grid gap-2">
              {mockUsers.map((u) => (
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
                    <span className="font-medium text-foreground">{roleLabels[u.role]}</span>
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
