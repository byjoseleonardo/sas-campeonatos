import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const champs = await prisma.championship.findMany({
    select: {
      id: true, name: true, sport: true, status: true,
      matches: {
        where: { round: { in: ["semifinal", "final", "tercer_puesto"] } },
        select: { round: true, roundLabel: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const c of champs) {
    console.log(`\n🏆 ${c.name} (${c.sport}) · status=${c.status}`);
    if (c.matches.length === 0) { console.log("   (sin partidos de llave)"); continue; }
    c.matches.forEach((m) =>
      console.log(`   [${m.round}] ${m.homeTeam?.name ?? "Por definir"} vs ${m.awayTeam?.name ?? "Por definir"}`)
    );
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
