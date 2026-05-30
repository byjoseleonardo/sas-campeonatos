import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role, MatchRound, Sport } from "@/lib/generated/prisma/enums";

// Deportes con llave funcional (vóley por sets; ajedrez no aplica)
const FUNCTIONAL_SPORTS: Sport[] = [Sport.futbol, Sport.futsal, Sport.voleibol];

// Los equipos son opcionales: la llave puede crearse vacía ("Por definir")
// para insertar los cruces durante el sorteo presencial.
const bracketSchema = z.object({
  semifinals: z
    .array(
      z.object({
        homeTeamId: z.string().min(1).nullish(),
        awayTeamId: z.string().min(1).nullish(),
      })
    )
    .length(2, "Se requieren exactamente 2 semifinales")
    .optional(),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  return !!(await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  }));
}

// POST /api/championships/[id]/phases/[phaseId]/bracket
// Genera la llave de 4 equipos: 2 semifinales (con equipos) + final y tercer
// puesto vacíos, enlazados para auto-avance.
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

    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
      select: { sport: true },
    });
    if (!championship) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }
    if (!FUNCTIONAL_SPORTS.includes(championship.sport)) {
      return NextResponse.json(
        { error: "La generación de llave solo está disponible para fútbol" },
        { status: 400 }
      );
    }

    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase || phase.championshipId !== championshipId) {
      return NextResponse.json({ error: "Fase no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const { semifinals } = bracketSchema.parse(body);
    const semis = semifinals ?? [{}, {}];

    // Equipos asignados (puede ser ninguno: llave vacía para sorteo presencial)
    const providedIds = [
      semis[0]?.homeTeamId, semis[0]?.awayTeamId,
      semis[1]?.homeTeamId, semis[1]?.awayTeamId,
    ].filter((x): x is string => !!x);

    // Los equipos asignados deben ser distintos entre sí
    if (new Set(providedIds).size !== providedIds.length) {
      return NextResponse.json(
        { error: "No puedes repetir un equipo en la llave" },
        { status: 400 }
      );
    }
    // ...y pertenecer al campeonato
    if (providedIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: { id: { in: providedIds }, championshipId },
        select: { id: true },
      });
      if (teams.length !== providedIds.length) {
        return NextResponse.json(
          { error: "Algún equipo no pertenece a este campeonato" },
          { status: 400 }
        );
      }
    }

    const withThird = phase.hasThirdPlace;

    const result = await prisma.$transaction(async (tx) => {
      // Limpiar bracket previo de la fase
      await tx.match.deleteMany({ where: { phaseId } });

      // Final (vacía)
      const final = await tx.match.create({
        data: {
          championshipId,
          phaseId,
          homeTeamId: null,
          awayTeamId: null,
          round: MatchRound.final,
          roundLabel: "Final",
          status: "programado",
        },
      });

      // Tercer puesto (vacío) — solo si la fase lo contempla
      const third = withThird
        ? await tx.match.create({
            data: {
              championshipId,
              phaseId,
              homeTeamId: null,
              awayTeamId: null,
              round: MatchRound.tercer_puesto,
              roundLabel: "Tercer puesto",
              status: "programado",
            },
          })
        : null;

      // Semifinales (ganador → final slot home/away; perdedor → 3er puesto)
      const createdSemis = [];
      for (let i = 0; i < 2; i++) {
        const slot = i === 0 ? "home" : "away";
        const semi = await tx.match.create({
          data: {
            championshipId,
            phaseId,
            homeTeamId: semis[i]?.homeTeamId ?? null,
            awayTeamId: semis[i]?.awayTeamId ?? null,
            round: MatchRound.semifinal,
            roundLabel: `Semifinal ${i + 1}`,
            status: "programado",
            nextMatchId: final.id,
            nextMatchSlot: slot,
            loserNextMatchId: third?.id ?? null,
            loserNextMatchSlot: third ? slot : null,
          },
        });
        createdSemis.push(semi);
      }

      return { final, third, semis: createdSemis };
    });

    return NextResponse.json(
      { created: 2 + 1 + (withThird ? 1 : 0), ...result },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /bracket]", error);
    return NextResponse.json({ error: "Error al generar la llave" }, { status: 500 });
  }
}
