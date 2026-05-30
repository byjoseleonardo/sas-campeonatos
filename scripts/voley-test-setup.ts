import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Helper TEMPORAL de test: prepara la llave de vóley sobre el campeonato REAL
// "Voley Damas" + sus 4 equipos reales, y crea un técnico con clave conocida.
// Correr: npx tsx scripts/voley-test-setup.ts

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TECNICO_EMAIL = "tecnico.voley@test.com";
const TECNICO_PASS = "Voley1234";

async function main() {
  // 1) Campeonato de vóley
  const champ = await prisma.championship.findFirst({
    where: { sport: "voleibol" },
    select: { id: true, name: true, createdById: true },
  });
  if (!champ) throw new Error("No hay campeonato de voleibol");
  console.log(`🏐 Campeonato: ${champ.name} (${champ.id})`);

  // 2) Equipos (4)
  const teams = await prisma.team.findMany({
    where: { championshipId: champ.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (teams.length < 4) throw new Error(`Se requieren 4 equipos, hay ${teams.length}`);
  const [t0, t1, t2, t3] = teams;
  console.log(`👥 Equipos: ${teams.map((t) => t.name).join(", ")}`);

  // 3) Campeonato en curso
  await prisma.championship.update({ where: { id: champ.id }, data: { status: "en_curso" } });

  // 4) Fase de eliminación (reusar si existe, si no crear con el siguiente order)
  let phase = await prisma.phase.findFirst({ where: { championshipId: champ.id, type: "eliminacion" } });
  if (!phase) {
    const maxOrder = await prisma.phase.aggregate({ where: { championshipId: champ.id }, _max: { order: true } });
    phase = await prisma.phase.create({
      data: {
        championshipId: champ.id,
        name: "Eliminación",
        type: "eliminacion",
        order: (maxOrder._max.order ?? 0) + 1,
        hasThirdPlace: true,
      },
    });
  }
  const phaseId = phase.id;
  console.log(`🧩 Fase: ${phase.name} (${phaseId})`);

  // 5) Llave — replica de app/api/championships/[id]/phases/[phaseId]/bracket/route.ts
  const result = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { phaseId } });

    const final = await tx.match.create({
      data: { championshipId: champ.id, phaseId, round: "final", roundLabel: "Final", status: "programado" },
    });
    const third = await tx.match.create({
      data: { championshipId: champ.id, phaseId, round: "tercer_puesto", roundLabel: "Tercer puesto", status: "programado" },
    });

    const semiData = [
      { home: t0.id, away: t1.id, slot: "home", label: "Semifinal 1" },
      { home: t2.id, away: t3.id, slot: "away", label: "Semifinal 2" },
    ];
    const semis = [];
    for (const s of semiData) {
      const semi = await tx.match.create({
        data: {
          championshipId: champ.id,
          phaseId,
          homeTeamId: s.home,
          awayTeamId: s.away,
          round: "semifinal",
          roundLabel: s.label,
          status: "programado",
          nextMatchId: final.id,
          nextMatchSlot: s.slot,
          loserNextMatchId: third.id,
          loserNextMatchSlot: s.slot,
        },
      });
      semis.push(semi);
    }
    return { final, third, semis };
  });

  // 6) Técnico con credenciales conocidas (tenant = adminId del creador del campeonato)
  const creator = await prisma.user.findUnique({
    where: { id: champ.createdById },
    select: { id: true, adminId: true },
  });
  const tenantAdminId = creator?.adminId ?? creator?.id ?? null;
  const hash = await bcrypt.hash(TECNICO_PASS, 10);

  const tecnico = await prisma.user.upsert({
    where: { email: TECNICO_EMAIL },
    create: {
      email: TECNICO_EMAIL,
      firstName: "Técnico",
      paternalLastName: "Vóley",
      maternalLastName: "Test",
      password: hash,
      isActive: true,
      mustChangePassword: false,
      adminId: tenantAdminId,
    },
    update: { password: hash, isActive: true, mustChangePassword: false },
  });

  // 7) Rol tecnico_mesa para el campeonato
  const hasRole = await prisma.userRole.findFirst({
    where: { userId: tecnico.id, role: "tecnico_mesa", championshipId: champ.id },
  });
  if (!hasRole) {
    await prisma.userRole.create({ data: { userId: tecnico.id, role: "tecnico_mesa", championshipId: champ.id } });
  }

  // 8) Asignar el técnico a las 4 partidas
  const allMatchIds = [result.final.id, result.third.id, ...result.semis.map((s) => s.id)];
  await prisma.match.updateMany({ where: { id: { in: allMatchIds } }, data: { tecnicoId: tecnico.id } });

  console.log("\n──────── LISTO ────────");
  console.log(`Campeonato:   ${champ.id}`);
  console.log(`Semifinal 1 (${t0.name} vs ${t1.name}): ${result.semis[0].id}`);
  console.log(`Semifinal 2 (${t2.name} vs ${t3.name}): ${result.semis[1].id}`);
  console.log(`Final:        ${result.final.id}`);
  console.log(`Tercer puesto:${result.third.id}`);
  console.log(`Técnico:      ${TECNICO_EMAIL} / ${TECNICO_PASS}`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
