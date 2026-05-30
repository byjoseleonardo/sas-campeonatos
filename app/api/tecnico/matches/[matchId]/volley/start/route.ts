import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Sport } from "@/lib/generated/prisma/enums";
import { canAccessMatch } from "@/lib/match-access";
import { volleySelect } from "../shared";

const startSchema = z.object({
  setsToWin: z.number().int().refine((v) => v === 2 || v === 3, "Formato inválido (2 o 3 sets para ganar)"),
  pointsPerSet: z.number().int().min(1).max(99),
  decidingSetPoints: z.number().int().min(1).max(99).nullable().optional(),
  winByMargin: z.number().int().min(1).max(10).optional(),
  capPoints: z.number().int().min(1).max(99).nullable().optional(),
});

// POST /api/tecnico/matches/[matchId]/volley/start — iniciar partido de vóley
// con la configuración que define la mesa técnica (formato, puntos, ventaja, tope).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { matchId } = await params;
    if (!(await canAccessMatch(session.user.id, matchId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const data = startSchema.parse(await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        championship: { select: { sport: true } },
      },
    });
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (match.championship.sport !== Sport.voleibol) {
      return NextResponse.json({ error: "Esta acción es solo para partidos de vóley" }, { status: 400 });
    }
    if (match.status !== "programado" && match.status !== "postergado") {
      return NextResponse.json({ error: "El partido ya fue iniciado" }, { status: 409 });
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      return NextResponse.json({ error: "Faltan equipos por definir en este partido" }, { status: 409 });
    }

    const fresh = await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "en_curso",
          startedAt: new Date(),
          setsToWin: data.setsToWin,
          pointsPerSet: data.pointsPerSet,
          decidingSetPoints: data.decidingSetPoints ?? null,
          winByMargin: data.winByMargin ?? 2,
          capPoints: data.capPoints ?? null,
          currentSet: 1,
          homeScore: 0,
          awayScore: 0,
          winnerTeamId: null,
          endedAt: null,
        },
      });
      // Set 1 en curso; limpia restos de un inicio previo.
      await tx.matchSet.deleteMany({ where: { matchId } });
      await tx.matchSet.create({
        data: { matchId, setNumber: 1, homePoints: 0, awayPoints: 0, status: "en_curso" },
      });
      return tx.match.findUnique({ where: { id: matchId }, select: volleySelect });
    });

    return NextResponse.json(fresh);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /api/tecnico/matches/[matchId]/volley/start]", error);
    return NextResponse.json({ error: "Error al iniciar el partido" }, { status: 500 });
  }
}
