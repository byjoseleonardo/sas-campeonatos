import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomBytes } from "crypto";
import { Role } from "@/lib/generated/prisma/enums";

// ─── Utilidades de sorteo ────────────────────────────────────────────────────

function generateSeed(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Fisher-Yates shuffle determinístico usando mulberry32 PRNG.
 * Dado el mismo seed siempre produce el mismo resultado → verificable.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let s = parseInt(seed.slice(0, 8), 16);
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = (Math.imul(z ^ (z >>> 15), z | 1)) >>> 0;
    z = (z ^ (z + (Math.imul(z ^ (z >>> 7), z | 61)) >>> 0)) >>> 0;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Siguiente potencia de 2 mayor o igual a n */
function nextPowerOf2(n: number): number {
  if (n <= 1) return 2;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

const GROUP_NAMES = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];

const ROUND_LABELS: Record<number, string> = {
  32: "Dieciseisavos de final",
  16: "Octavos de final",
  8:  "Cuartos de final",
  4:  "Semifinal",
  2:  "Final",
};

// ─── Auth ────────────────────────────────────────────────────────────────────

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  return !!(await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  }));
}

// ─── POST /api/championships/[id]/phases/[phaseId]/draw ─────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: championshipId, phaseId } = await params;

    if (!(await canManage(session.user.id, session.user.role, championshipId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase || phase.championshipId !== championshipId) {
      return NextResponse.json({ error: "Fase no encontrada" }, { status: 404 });
    }
    if (phase.type !== "grupos" && phase.type !== "eliminacion") {
      return NextResponse.json({ error: "Esta fase no requiere sorteo" }, { status: 400 });
    }

    // teamIds opcionales: si vienen, sortear solo esos equipos (clasificados de fase anterior)
    const body = await req.json().catch(() => ({}));
    const teamIds: string[] | undefined = Array.isArray(body?.teamIds) ? body.teamIds : undefined;

    const teams = teamIds?.length
      ? await prisma.team.findMany({
          where: { id: { in: teamIds }, championshipId },
          select: { id: true, name: true },
        })
      : await prisma.team.findMany({
          where: { championshipId, status: "activo" },
          select: { id: true, name: true },
        });

    if (teams.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 equipos inscritos para realizar el sorteo" },
        { status: 400 }
      );
    }

    const seed = generateSeed();
    const shuffled = seededShuffle(teams, seed);

    // ── Sorteo de grupos ───────────────────────────────────────────────────

    if (phase.type === "grupos") {
      const numGroups = phase.numGroups ?? 2;

      if (shuffled.length < numGroups) {
        return NextResponse.json(
          { error: `Se necesitan al menos ${numGroups} equipos para ${numGroups} grupos` },
          { status: 400 }
        );
      }

      // Borrar sorteo anterior de este campeonato
      await prisma.groupTeam.deleteMany({ where: { group: { championshipId } } });
      await prisma.group.deleteMany({ where: { championshipId } });

      // Distribución: equipos sobrantes van a los primeros grupos
      const base = Math.floor(shuffled.length / numGroups);
      const extra = shuffled.length % numGroups;
      const groupResults = [];
      let cursor = 0;

      for (let g = 0; g < numGroups; g++) {
        const size = base + (g < extra ? 1 : 0);
        const slice = shuffled.slice(cursor, cursor + size);
        cursor += size;

        const groupName = `Grupo ${GROUP_NAMES[g] ?? g + 1}`;
        const group = await prisma.group.create({
          data: {
            championshipId,
            name: groupName,
            groupTeams: { create: slice.map((t) => ({ teamId: t.id })) },
          },
          include: {
            groupTeams: { include: { team: { select: { id: true, name: true } } } },
          },
        });

        groupResults.push({
          id: group.id,
          name: groupName,
          teams: group.groupTeams.map((gt) => gt.team),
        });
      }

      return NextResponse.json({ seed, type: "grupos", totalTeams: shuffled.length, groups: groupResults });
    }

    // ── Sorteo de eliminación con byes ─────────────────────────────────────

    if (phase.type === "eliminacion") {
      const n = shuffled.length;
      const slots = nextPowerOf2(n);
      const byes = slots - n;

      // Borrar partidos previos de esta fase
      await prisma.match.deleteMany({ where: { phaseId } });

      // Los primeros `byes` equipos del sorteo pasan directamente
      const byeTeams = shuffled.slice(0, byes);
      const playTeams = shuffled.slice(byes);

      const isFirstRoundPreliminary = byes > 0;
      const mainRoundLabel = ROUND_LABELS[slots] ?? `Ronda de ${slots}`;
      const matchLabel = isFirstRoundPreliminary ? "Ronda previa" : mainRoundLabel;

      const createdMatches = [];
      for (let i = 0; i < playTeams.length; i += 2) {
        const home = playTeams[i];
        const away = playTeams[i + 1];
        const match = await prisma.match.create({
          data: {
            championshipId,
            phaseId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            roundLabel: matchLabel,
            status: "programado",
          },
        });
        createdMatches.push({ id: match.id, home: home.name, away: away.name });
      }

      return NextResponse.json({
        seed,
        type: "eliminacion",
        totalTeams: n,
        slots,
        byes,
        mainRoundLabel,
        byeTeams: byeTeams.map((t) => ({ id: t.id, name: t.name })),
        matches: createdMatches,
      });
    }

  } catch (error) {
    console.error("[POST /draw]", error);
    return NextResponse.json({ error: "Error al realizar el sorteo" }, { status: 500 });
  }
}
