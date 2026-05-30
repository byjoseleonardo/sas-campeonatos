import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Campeonatos de vóley donde dejar la llave armada y VACÍA (cruces "Por definir"),
// listos para insertar los VS durante el sorteo presencial. Mismo formato que
// fútbol (2 semifinales → final + tercer puesto); el marcador será por sets.
const CHAMPIONSHIPS = ["Voley Damas"];

async function ensureBracket(championshipName: string) {
  const champ = await prisma.championship.findFirst({
    where: { name: championshipName },
    include: { teams: { select: { id: true, name: true } }, phases: { select: { id: true, type: true, order: true } } },
  });
  if (!champ) { console.warn(`⚠️  No se encontró "${championshipName}"`); return; }

  // Fase de eliminación (reusar si existe, si no crear)
  let phase = champ.phases.find((p) => p.type === "eliminacion");
  if (!phase) {
    const nextOrder = (champ.phases.reduce((max, p) => Math.max(max, p.order), 0)) + 1;
    phase = await prisma.phase.create({
      data: {
        championshipId: champ.id,
        name: "Eliminación",
        type: "eliminacion",
        order: nextOrder,
        startingRound: "semifinal",
        hasThirdPlace: true,
        legsPerMatch: 1,
      },
      select: { id: true, type: true, order: true },
    });
    console.log(`   + Fase "Eliminación" creada (id=${phase.id})`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { phaseId: phase!.id } });

    const final = await tx.match.create({
      data: { championshipId: champ.id, phaseId: phase!.id, round: "final", roundLabel: "Final", status: "programado" },
    });
    const third = await tx.match.create({
      data: { championshipId: champ.id, phaseId: phase!.id, round: "tercer_puesto", roundLabel: "Tercer puesto", status: "programado" },
    });
    await tx.match.create({
      data: {
        championshipId: champ.id, phaseId: phase!.id, round: "semifinal", roundLabel: "Semifinal 1", status: "programado",
        homeTeamId: null, awayTeamId: null,
        nextMatchId: final.id, nextMatchSlot: "home", loserNextMatchId: third.id, loserNextMatchSlot: "home",
      },
    });
    await tx.match.create({
      data: {
        championshipId: champ.id, phaseId: phase!.id, round: "semifinal", roundLabel: "Semifinal 2", status: "programado",
        homeTeamId: null, awayTeamId: null,
        nextMatchId: final.id, nextMatchSlot: "away", loserNextMatchId: third.id, loserNextMatchSlot: "away",
      },
    });
  });

  console.log(`✅ ${championshipName}: llave armada VACÍA (SF1, SF2, Final, 3er puesto — todo "Por definir")`);
}

async function main() {
  for (const name of CHAMPIONSHIPS) {
    await ensureBracket(name);
  }
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
