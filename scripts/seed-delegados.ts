/**
 * seed-delegados.ts
 *
 * Pobla los delegados del campeonato personalizado más reciente con:
 *  - Cuenta configurada (nombre real, email, contraseña, mustChangePassword=false)
 *  - Equipo registrado
 *  - Planilla completa (titulares + minSuplentes jugadores)
 *
 * Uso:
 *   npx tsx scripts/seed-delegados.ts
 *   npx tsx scripts/seed-delegados.ts --slug=copa-verano-2026
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Datos de prueba ─────────────────────────────────────────────────────────

const EQUIPOS: { name: string; delegadoName: string; delegadoEmail: string }[] = [
  { name: "Real Azul FC",       delegadoName: "Carlos Mendoza",   delegadoEmail: "cmendoza@test.com" },
  { name: "Deportivo Verde",    delegadoName: "Luis Paredes",     delegadoEmail: "lparedes@test.com" },
  { name: "Atlético Rojo",      delegadoName: "Diego Vargas",     delegadoEmail: "dvargas@test.com" },
  { name: "Club Universitario", delegadoName: "Andrés Torres",    delegadoEmail: "atorres@test.com" },
  { name: "Sporting Negro",     delegadoName: "Miguel Castro",    delegadoEmail: "mcastro@test.com" },
  { name: "Independiente FC",   delegadoName: "Pablo Romero",     delegadoEmail: "promero@test.com" },
  { name: "Estrella del Sur",   delegadoName: "Jorge Jiménez",    delegadoEmail: "jjimenez@test.com" },
  { name: "Nacional Dorado",    delegadoName: "Roberto Silva",    delegadoEmail: "rsilva@test.com" },
];

const NOMBRES = ["Juan", "Pedro", "Carlos", "Luis", "Diego", "Andrés", "Miguel", "Pablo", "Jorge", "Roberto",
                 "Sebastián", "Felipe", "Alejandro", "Fernando", "Nicolás", "Gustavo", "Raúl", "Héctor"];
const APELLIDOS = ["García", "López", "Martínez", "González", "Rodríguez", "Pérez", "Sánchez", "Torres",
                   "Ramírez", "Flores", "Rivera", "Morales", "Ortiz", "Castro", "Ramos", "Vargas"];

const POSICIONES_FUTBOL = ["Portero", "Defensa", "Lateral derecho", "Lateral izquierdo",
                            "Mediocampista", "Volante", "Extremo", "Delantero", "Centrodelantero"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDni(index: number): string {
  // DNI ficticio de 10 dígitos, único por índice
  return String(1000000000 + index).padStart(10, "0");
}

function randomBirthDate(): Date {
  const year = 1985 + Math.floor(Math.random() * 20); // entre 1985 y 2004
  const month = Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(year, month, day);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Leer --slug= del argumento
  const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];

  // Buscar campeonato
  const championship = slugArg
    ? await prisma.championship.findUnique({ where: { slug: slugArg } })
    : await prisma.championship.findFirst({
        where: { format: "personalizado" },
        orderBy: { createdAt: "desc" },
      });

  if (!championship) {
    console.error("❌ No se encontró ningún campeonato personalizado. Usa --slug=<slug> para especificar uno.");
    process.exit(1);
  }

  console.log(`\n🏆 Campeonato: ${championship.name} (${championship.slug})`);
  console.log(`   Titulares: ${championship.titulares} | Min. suplentes: ${championship.minSuplentes} | Max equipos: ${championship.maxEquipos}\n`);

  // Obtener delegados del campeonato
  const delegadoRoles = await prisma.userRole.findMany({
    where: { championshipId: championship.id, role: "delegado" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (delegadoRoles.length === 0) {
    console.error("❌ El campeonato no tiene delegados creados. Asegúrate de haber puesto maxEquipos > 0 al crearlo.");
    process.exit(1);
  }

  console.log(`👥 Delegados encontrados: ${delegadoRoles.length}`);

  const newPassword = "delegado123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const jugadoresCreados: number[] = [];
  let dniCounter = 1000; // base para generar DNIs únicos

  for (let i = 0; i < delegadoRoles.length; i++) {
    const role = delegadoRoles[i];
    const user = role.user;
    const datos = EQUIPOS[i % EQUIPOS.length];

    console.log(`\n── Delegado ${i + 1}: ${user.email}`);

    // 1. Actualizar cuenta del delegado
    const emailReal = `${datos.delegadoEmail.split("@")[0]}_${i + 1}@test.com`;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: datos.delegadoName,
        email: emailReal,
        password: hashedPassword,
        mustChangePassword: false,
        tempPassword: null,
        isActive: true,
      },
    });
    console.log(`   ✅ Cuenta: ${emailReal} / ${newPassword}`);

    // 2. Verificar si ya tiene equipo
    const existingTeam = await prisma.team.findFirst({
      where: { delegateId: user.id, championshipId: championship.id },
    });

    let teamId: string;

    if (existingTeam) {
      teamId = existingTeam.id;
      console.log(`   ⚠️  Ya tiene equipo: ${existingTeam.name} — omitiendo creación`);
    } else {
      // 3. Crear equipo
      const teamName = `${datos.name} ${i + 1}`;
      const team = await prisma.team.create({
        data: {
          name: teamName,
          championshipId: championship.id,
          delegateId: user.id,
        },
      });
      teamId = team.id;

      // Vincular el UserRole del delegado al equipo
      await prisma.userRole.update({
        where: { id: role.id },
        data: { teamId: team.id },
      });

      console.log(`   ✅ Equipo: ${teamName}`);
    }

    // 4. Contar jugadores ya inscritos
    const existingRoster = await prisma.rosterEntry.count({ where: { teamId } });
    const totalJugadoresNecesarios = championship.titulares + championship.minSuplentes;

    if (existingRoster >= totalJugadoresNecesarios) {
      console.log(`   ⚠️  Ya tiene ${existingRoster} jugadores — omitiendo planilla`);
      continue;
    }

    const faltantes = totalJugadoresNecesarios - existingRoster;
    const numerosUsados = await prisma.rosterEntry.findMany({
      where: { teamId },
      select: { number: true },
    }).then((r) => new Set(r.map((e) => e.number)));

    // 5. Crear jugadores y roster entries
    let camiseta = 1;
    let jugadoresAgregados = 0;

    for (let j = 0; j < faltantes; j++) {
      // Buscar camiseta libre
      while (numerosUsados.has(camiseta)) camiseta++;
      numerosUsados.add(camiseta);

      const dni = generateDni(dniCounter++);

      // Upsert jugador por DNI
      const player = await prisma.player.upsert({
        where: { dni },
        update: {},
        create: {
          dni,
          firstName: randomItem(NOMBRES),
          lastName: randomItem(APELLIDOS),
          birthDate: randomBirthDate(),
          gender: "M",
        },
      });

      // Intentar crear el roster entry (puede ya existir el jugador en otro equipo del mismo campeonato)
      try {
        await prisma.rosterEntry.create({
          data: {
            playerId: player.id,
            teamId,
            number: camiseta,
            position: camiseta === 1 ? "Portero" : randomItem(POSICIONES_FUTBOL.slice(1)),
            status: "inscrito",
          },
        });
        jugadoresAgregados++;
        camiseta++;
      } catch {
        // Conflicto de unique (jugador ya en el equipo), generar otro DNI
        dniCounter++;
        j--; // reintentar
      }
    }

    jugadoresCreados.push(jugadoresAgregados);
    console.log(`   ✅ Planilla: ${jugadoresAgregados} jugadores agregados (total: ${existingRoster + jugadoresAgregados}/${totalJugadoresNecesarios})`);
  }

  console.log("\n─────────────────────────────────────────────────");
  console.log(`✅ Proceso completado para ${delegadoRoles.length} delegado(s)`);
  console.log(`   Contraseña de todos los delegados: ${newPassword}`);
  console.log("─────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
