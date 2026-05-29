import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[720px] items-center overflow-hidden bg-hero">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/baner.webp"
          alt="V Olimpiada Deportiva Nacional CIP 2026 — 64 años Colegio de Ingenieros del Perú"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-transparent" />
      </div>

      <div className="container relative z-10 w-full py-16">
        <div className="max-w-2xl">
          <p className="animate-fade-in-up text-xs font-semibold uppercase tracking-widest text-primary">
            Colegio de Ingenieros del Perú · Consejo Nacional
          </p>
          <h1 className="mt-4 animate-fade-in-up font-display text-5xl leading-tight text-secondary-foreground md:text-7xl">
            V OLIMPIADA DEPORTIVA{" "}
            <span className="text-primary">NACIONAL CIP 2026</span>
          </h1>
          <p className="mt-6 animate-fade-in-up text-lg font-semibold text-secondary-foreground/85 [animation-delay:200ms]">
            Excelencia profesional, pasión deportiva.
          </p>
          <p className="mt-1 animate-fade-in-up text-sm text-secondary-foreground/60 [animation-delay:200ms]">
            Sigue los campeonatos, equipos y resultados en tiempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 animate-fade-in-up [animation-delay:400ms]">
            <Button size="lg" asChild>
              <Link href="/campeonatos">
                Ver Disciplinas <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white" asChild>
              <Link href="/equipos">Explorar Equipos</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
