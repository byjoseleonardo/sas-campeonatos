import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Trophy, Calendar } from "lucide-react";

const stats = [
  { icon: Trophy, label: "Campeonatos", value: "120+" },
  { icon: Users, label: "Equipos", value: "1,500+" },
  { icon: Calendar, label: "Partidos", value: "8,000+" },
];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/hero-sports.jpg"
          alt="Deportes en acción"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-transparent" />
      </div>

      <div className="container relative z-10 py-24 md:py-36">
        <div className="max-w-2xl">
          <h1 className="animate-fade-in-up font-display text-5xl leading-tight text-secondary-foreground md:text-7xl">
            GESTIONA TUS{" "}
            <span className="text-primary">CAMPEONATOS</span>{" "}
            COMO UN PRO
          </h1>
          <p className="mt-6 animate-fade-in-up text-lg text-secondary-foreground/70 [animation-delay:200ms]">
            Organiza torneos, registra equipos, lleva estadísticas en tiempo real
            y comparte resultados con tu comunidad deportiva.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 animate-fade-in-up [animation-delay:400ms]">
            <Button size="lg" asChild>
              <Link href="/campeonatos">
                Ver Campeonatos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link href="/equipos">Explorar Equipos</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg animate-fade-in-up [animation-delay:600ms]">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <div className="font-display text-3xl text-secondary-foreground">{stat.value}</div>
              <div className="text-xs text-secondary-foreground/50 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
