import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";
import { repropagateBracket } from "@/lib/bracket";

const BRACKET_ROUNDS = ["semifinal", "final", "tercer_puesto"];

const schema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  winnerTeamId: z.string().optional(), // obligatorio solo si hay empate
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  return !!(await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  }));
}

// PATCH /api/championships/[id]/phases/[phaseId]/matches/[matchId]/result
// Corrige el resultado de un partido de llave (admin/organizador) y RE-PROPAGA:
// si cambia el ganador de una semifinal, actualiza final y tercer puesto, y los
// reinicia si ya se habían jugado con el equipo equivocado.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: championshipId, matchId } = await params;
    if (!(await canManage(session.user.id, session.user.role, championshipId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    const current = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        round: true, homeTeamId: true, awayTeamId: true,
        nextMatchId: true, nextMatchSlot: true,
        loserNextMatchId: true, loserNextMatchSlot: true,
      },
    });
    if (!current) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    if (!BRACKET_ROUNDS.includes(current.round)) {
      return NextResponse.json({ error: "Este partido no es de la llave" }, { status: 400 });
    }
    if (!current.homeTeamId || !current.awayTeamId) {
      return NextResponse.json({ error: "El partido aún no tiene equipos definidos" }, { status: 400 });
    }

    // Determinar ganador/perdedor
    let winnerTeamId: string;
    let loserTeamId: string;
    if (data.homeScore > data.awayScore) {
      winnerTeamId = current.homeTeamId; loserTeamId = current.awayTeamId;
    } else if (data.awayScore > data.homeScore) {
      winnerTeamId = current.awayTeamId; loserTeamId = current.homeTeamId;
    } else {
      if (!data.winnerTeamId) {
        return NextResponse.json(
          { requiresWinner: true, error: "Empate: debe elegir el ganador (penales)" },
          { status: 422 }
        );
      }
      if (data.winnerTeamId !== current.homeTeamId && data.winnerTeamId !== current.awayTeamId) {
        return NextResponse.json({ error: "Ganador inválido" }, { status: 400 });
      }
      winnerTeamId = data.winnerTeamId;
      loserTeamId = data.winnerTeamId === current.homeTeamId ? current.awayTeamId : current.homeTeamId;
    }

    const match = await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data: {
          status: "finalizado",
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          winnerTeamId,
          endedAt: new Date(),
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      });

      // Re-propaga (sobrescribe) la final y el tercer puesto si es semifinal
      await repropagateBracket(tx, current, winnerTeamId, loserTeamId);

      return updated;
    });

    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /matches/[matchId]/result]", error);
    return NextResponse.json({ error: "Error al corregir el resultado" }, { status: 500 });
  }
}
