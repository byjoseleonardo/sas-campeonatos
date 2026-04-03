import HeroSection from "@/components/HeroSection";
import ChampionshipCard from "@/components/ChampionshipCard";
import MatchCard from "@/components/MatchCard";
import { championships, matches } from "@/lib/mockData";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const activeChampionships = championships.filter((c) => c.status !== "finalizado").slice(0, 3);
  const recentMatches = matches.slice(0, 4);

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Featured Championships */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-4xl text-foreground">CAMPEONATOS DESTACADOS</h2>
            <p className="mt-1 text-sm text-muted-foreground">Los torneos más recientes de la plataforma</p>
          </div>
          <Link href="/campeonatos" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeChampionships.map((c) => (
            <ChampionshipCard key={c.id} {...c} />
          ))}
        </div>
      </section>

      {/* Recent Matches */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-4xl text-foreground">ÚLTIMOS PARTIDOS</h2>
              <p className="mt-1 text-sm text-muted-foreground">Resultados y próximos encuentros</p>
            </div>
            <Link href="/partidos" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recentMatches.map((m, i) => (
              <MatchCard key={i} {...m} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
