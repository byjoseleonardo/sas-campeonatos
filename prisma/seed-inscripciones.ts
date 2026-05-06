/**
 * Seed de inscripciones ficticias para el campeonato "copa - pruebas"
 * Uso: npx tsx prisma/seed-inscripciones.ts
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Datos ficticios ──────────────────────────────────────────────────────────

const EQUIPOS = [
  "Águilas FC",
  "Leones SC",
  "Dragones United",
  "Panteras BC",
  "Halcones Dorados",
  "Cóndores del Sur",
  "Tigres Reales",
  "Gladiadores FC",
];

const NOMBRES = ["Carlos", "Luis", "Miguel", "José", "Andrés", "Diego", "Juan", "Pedro", "Sebastián", "Mateo", "Alejandro", "Fernando", "Ricardo", "Daniel", "Iván"];
const APELLIDOS = ["García", "Rodríguez", "López", "Martínez", "Pérez", "Sánchez", "Torres", "Flores", "Herrera", "Moreno", "Castro", "Vargas", "Ríos", "Mendoza", "Aguero"];
const POSICIONES = ["Portero", "Defensa Central", "Lateral Derecho", "Lateral Izquierdo", "Mediocampista", "Mediocampista Defensivo", "Extremo", "Delantero Centro"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarCIP(idx: number) {
  return String(200000000 + idx).padStart(9, "0");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Encontrar el campeonato
  const campeonato = await prisma.championship.findFirst({
    where: { name: { contains: "prueba", mode: "insensitive" } },
  });

  if (!campeonato) {
    console.error('❌ No se encontró un campeonato con "prueba" en el nombre.');
    console.error("   Verifica el nombre exacto en la base de datos.");
    process.exit(1);
  }

  console.log(`✅ Campeonato encontrado: "${campeonato.name}" (${campeonato.id})`);

  // 2. Obtener los cupos de delegados generados para este campeonato
  const cupos = await prisma.userRole.findMany({
    where: { championshipId: campeonato.id, role: "delegado" },
    include: { user: true, team: true },
  });

  if (cupos.length === 0) {
    console.error("❌ No hay cupos de delegado generados para este campeonato.");
    console.error("   Asegúrate de haber configurado maxEquipos > 0 al crearlo.");
    process.exit(1);
  }

  console.log(`✅ ${cupos.length} cupos de delegado encontrados`);

  // 3. Para cada cupo (hasta la cantidad de equipos ficticios disponibles)
  const equiposACrear = Math.min(cupos.length, EQUIPOS.length);
  let cipCounter = 1;

  for (let i = 0; i < equiposACrear; i++) {
    const cupo = cupos[i];

    // Saltar si ya tiene equipo asignado
    if (cupo.team) {
      console.log(`⏭️  Delegado ${cupo.user.email} ya tiene equipo asignado, saltando...`);
      continue;
    }

    const nombreEquipo = EQUIPOS[i];

    // Verificar que el equipo no exista ya
    const equipoExistente = await prisma.team.findFirst({
      where: { name: nombreEquipo, championshipId: campeonato.id },
    });

    if (equipoExistente) {
      console.log(`⏭️  Equipo "${nombreEquipo}" ya existe, saltando...`);
      continue;
    }

    // Crear equipo
    const equipo = await prisma.team.create({
      data: {
        name: nombreEquipo,
        championshipId: campeonato.id,
        delegateId: cupo.userId,
        status: "activo",
      },
    });

    // Asignar teamId al UserRole del delegado
    await prisma.userRole.update({
      where: { id: cupo.id },
      data: { teamId: equipo.id },
    });

    console.log(`\n🛡️  Equipo creado: ${nombreEquipo}`);

    // Crear jugadores (mínimo requerido + algunos más)
    const numJugadores = Math.max(campeonato.minJugadores, randInt(campeonato.minJugadores, Math.min(campeonato.maxInscripciones, campeonato.minJugadores + 5)));
    const numerosUsados = new Set<number>();

    for (let j = 0; j < numJugadores; j++) {
      const firstName = rand(NOMBRES);
      const paternalLastName = rand(APELLIDOS);
      const maternalLastName = rand(APELLIDOS);
      const cip = generarCIP(cipCounter++);

      // Número de camiseta único dentro del equipo
      let numero: number;
      do { numero = randInt(1, 30); } while (numerosUsados.has(numero));
      numerosUsados.add(numero);

      // Posición: el primero siempre es portero
      const posicion = j === 0 ? "Portero" : rand(POSICIONES.slice(1));

      // Crear o reutilizar jugador por CIP
      const jugador = await prisma.player.upsert({
        where: { dni: cip },
        update: {},
        create: {
          dni: cip,
          firstName,
          paternalLastName,
          maternalLastName,
          gender: "M",
        },
      });

      // Inscribir en el equipo (ignorar si ya existe)
      try {
        await prisma.rosterEntry.create({
          data: {
            playerId: jugador.id,
            teamId: equipo.id,
            number: numero,
            position: posicion,
            status: "inscrito",
          },
        });
        console.log(`   ✓ ${firstName} ${paternalLastName} — #${numero} ${posicion}`);
      } catch {
        // Puede fallar por unique constraint si el jugador ya está en el equipo
      }
    }
  }

  console.log("\n🎉 Seed de inscripciones completado.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
