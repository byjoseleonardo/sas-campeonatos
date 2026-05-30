import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { advanceBracket } from "@/lib/bracket";
import { canAccessMatch } from "@/lib/match-access";

// GET /api/tecnico/matches/[matchId] — detalle con eventos y planillas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { matchId } = await params;
    if (!await canAccessMatch(session.user.id, matchId)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam:    { select: { id: true, name: true } },
        awayTeam:    { select: { id: true, name: true } },
        championship: { select: { id: true, name: true, sport: true } },
        phase:        { select: { id: true, name: true } },
        events: {
          include: {
            player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true } },
            team:   { select: { id: true, name: true } },
          },
          orderBy: { minute: "asc" },
        },
        sets: {
          orderBy: { setNumber: "asc" },
          select: { setNumber: true, homePoints: true, awayPoints: true, status: true, winnerTeamId: true },
        },
      },
    });

    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    // Planillas de ambos equipos
    const teamIds = [match.homeTeamId, match.awayTeamId].filter((x): x is string => !!x);
    const rosters = await prisma.rosterEntry.findMany({
      where: {
        teamId: { in: teamIds },
        status: "inscrito",
      },
      include: {
        player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true, dni: true } },
      },
      orderBy: { number: "asc" },
    });

    const homeRoster = rosters.filter((r) => r.teamId === match.homeTeamId);
    const awayRoster = rosters.filter((r) => r.teamId === match.awayTeamId);

    return NextResponse.json({ ...match, homeRoster, awayRoster });
  } catch (error) {
    console.error("[GET /api/tecnico/matches/[matchId]]", error);
    return NextResponse.json({ error: "Error al obtener partido" }, { status: 500 });
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("iniciar") }),
  z.object({
    action:       z.literal("finalizar"),
    // Obligatorio solo cuando hay empate (definición por penales)
    winnerTeamId: z.string().optional(),
  }),
  z.object({
    action:        z.literal("walkover"),
    winnerTeamId:  z.string(),
  }),
]);

// PATCH /api/tecnico/matches/[matchId] — iniciar / finalizar / walkover
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { matchId } = await params;
    const matchMeta = await canAccessMatch(session.user.id, matchId);
    if (!matchMeta) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

    const body = await req.json();
    const data = patchSchema.parse(body);

    const current = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        round: true,
        nextMatchId: true,
        nextMatchSlot: true,
        loserNextMatchId: true,
        loserNextMatchSlot: true,
      },
    });
    if (!current) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    // ── Iniciar ──────────────────────────────────────────────────────────────
    if (data.action === "iniciar") {
      if (current.status !== "programado" && current.status !== "postergado") {
        return NextResponse.json({ error: "El partido ya fue iniciado" }, { status: 409 });
      }
      if (!current.homeTeamId || !current.awayTeamId) {
        return NextResponse.json(
          { error: "Faltan equipos por definir en este partido" },
          { status: 409 }
        );
      }
      const match = await prisma.match.update({
        where: { id: matchId },
        data: { status: "en_curso", startedAt: new Date() },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(match);
    }

    // ── Determinar ganador/perdedor (finalizar y walkover) ────────────────────
    let winnerTeamId: string;
    let loserTeamId: string;
    let scoreUpdate: { homeScore: number; awayScore: number } | null = null;

    if (data.action === "finalizar") {
      if (current.status !== "en_curso") {
        return NextResponse.json({ error: "El partido no está en curso" }, { status: 409 });
      }
      const { homeScore, awayScore, homeTeamId, awayTeamId } = current;
      if (homeScore > awayScore) {
        winnerTeamId = homeTeamId!;
        loserTeamId = awayTeamId!;
      } else if (awayScore > homeScore) {
        winnerTeamId = awayTeamId!;
        loserTeamId = homeTeamId!;
      } else {
        // Empate: la mesa técnica debe elegir ganador (penales)
        if (!data.winnerTeamId) {
          return NextResponse.json(
            { requiresWinner: true, error: "Empate: debe elegir el ganador (penales)" },
            { status: 422 }
          );
        }
        if (data.winnerTeamId !== homeTeamId && data.winnerTeamId !== awayTeamId) {
          return NextResponse.json({ error: "Ganador inválido" }, { status: 400 });
        }
        winnerTeamId = data.winnerTeamId;
        loserTeamId = data.winnerTeamId === homeTeamId ? awayTeamId! : homeTeamId!;
      }
    } else {
      // walkover
      if (current.status === "finalizado") {
        return NextResponse.json({ error: "El partido ya está finalizado" }, { status: 409 });
      }
      if (data.winnerTeamId !== current.homeTeamId && data.winnerTeamId !== current.awayTeamId) {
        return NextResponse.json({ error: "Ganador inválido" }, { status: 400 });
      }
      const isHome = data.winnerTeamId === current.homeTeamId;
      winnerTeamId = data.winnerTeamId;
      loserTeamId = isHome ? current.awayTeamId! : current.homeTeamId!;
      scoreUpdate = { homeScore: isHome ? 3 : 0, awayScore: isHome ? 0 : 3 };
    }

    // ── Finalizar partido + auto-avance de la llave (transacción) ─────────────
    const match = await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data: {
          status: "finalizado",
          endedAt: new Date(),
          winnerTeamId,
          ...(scoreUpdate ?? {}),
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      });

      await advanceBracket(tx, current, winnerTeamId, loserTeamId);

      return updated;
    });

    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/tecnico/matches/[matchId]]", error);
    return NextResponse.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}
