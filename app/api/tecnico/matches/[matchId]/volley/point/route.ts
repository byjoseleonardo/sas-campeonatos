import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Sport } from "@/lib/generated/prisma/enums";
import { canAccessMatch } from "@/lib/match-access";
import { advanceBracket } from "@/lib/bracket";
import { setOutcome, setsWonFrom, matchOutcome, type VolleyConfig, type SetWinner } from "@/lib/volley";
import { volleySelect } from "../shared";

const pointSchema = z.object({
  team: z.enum(["home", "away"]),
  delta: z.union([z.literal(1), z.literal(-1)]),
});

// POST /api/tecnico/matches/[matchId]/volley/point — sumar/restar un punto al set
// actual. Cierra el set y el partido automáticamente y propaga la llave.
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

    const data = pointSchema.parse(await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        currentSet: true,
        homeTeamId: true,
        awayTeamId: true,
        setsToWin: true,
        pointsPerSet: true,
        decidingSetPoints: true,
        winByMargin: true,
        capPoints: true,
        round: true,
        nextMatchId: true,
        nextMatchSlot: true,
        loserNextMatchId: true,
        loserNextMatchSlot: true,
        championship: { select: { sport: true } },
      },
    });
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (match.championship.sport !== Sport.voleibol) {
      return NextResponse.json({ error: "Esta acción es solo para partidos de vóley" }, { status: 400 });
    }
    if (match.status !== "en_curso") {
      return NextResponse.json({ error: "El partido no está en curso" }, { status: 409 });
    }
    if (!match.currentSet || match.setsToWin == null || match.pointsPerSet == null) {
      return NextResponse.json({ error: "El partido de vóley no fue iniciado correctamente" }, { status: 409 });
    }

    const cfg: VolleyConfig = {
      setsToWin: match.setsToWin,
      pointsPerSet: match.pointsPerSet,
      decidingSetPoints: match.decidingSetPoints,
      winByMargin: match.winByMargin ?? 2,
      capPoints: match.capPoints,
    };
    const setNumber = match.currentSet;
    const homeTeamId = match.homeTeamId!;
    const awayTeamId = match.awayTeamId!;

    await prisma.$transaction(async (tx) => {
      const cur = await tx.matchSet.findUnique({
        where: { matchId_setNumber: { matchId, setNumber } },
      });
      if (!cur || cur.status !== "en_curso") {
        throw new Error("SET_NOT_OPEN");
      }

      // Aplica el punto (deshacer = -1), nunca por debajo de 0.
      const home = Math.max(0, cur.homePoints + (data.team === "home" ? data.delta : 0));
      const away = Math.max(0, cur.awayPoints + (data.team === "away" ? data.delta : 0));

      const so = setOutcome(home, away, setNumber, cfg);

      if (!so.over) {
        // Solo actualiza los puntos del set en curso.
        await tx.matchSet.update({
          where: { matchId_setNumber: { matchId, setNumber } },
          data: { homePoints: home, awayPoints: away },
        });
        return;
      }

      // El set se cierra.
      const setWinnerTeamId = so.winner === "home" ? homeTeamId : awayTeamId;
      await tx.matchSet.update({
        where: { matchId_setNumber: { matchId, setNumber } },
        data: { homePoints: home, awayPoints: away, status: "finalizado", winnerTeamId: setWinnerTeamId },
      });

      // Recalcula sets ganados desde todos los sets finalizados.
      const allSets = await tx.matchSet.findMany({ where: { matchId } });
      const won = setsWonFrom(
        allSets.map((s) => ({
          status: s.status,
          winner: (s.winnerTeamId == null
            ? null
            : s.winnerTeamId === homeTeamId
              ? "home"
              : "away") as SetWinner,
        }))
      );

      const mo = matchOutcome(won, cfg.setsToWin);

      if (mo.over) {
        // Partido finalizado: marcador = sets ganados, ganador y propagación de llave.
        const winnerTeamId = mo.winner === "home" ? homeTeamId : awayTeamId;
        const loserTeamId = mo.winner === "home" ? awayTeamId : homeTeamId;
        await tx.match.update({
          where: { id: matchId },
          data: {
            homeScore: won.home,
            awayScore: won.away,
            status: "finalizado",
            endedAt: new Date(),
            winnerTeamId,
          },
        });
        await advanceBracket(tx, match, winnerTeamId, loserTeamId);
        return;
      }

      // Abre el siguiente set.
      const nextSetNumber = setNumber + 1;
      await tx.match.update({
        where: { id: matchId },
        data: { homeScore: won.home, awayScore: won.away, currentSet: nextSetNumber },
      });
      await tx.matchSet.upsert({
        where: { matchId_setNumber: { matchId, setNumber: nextSetNumber } },
        create: { matchId, setNumber: nextSetNumber, homePoints: 0, awayPoints: 0, status: "en_curso" },
        update: { status: "en_curso" },
      });
    });

    const fresh = await prisma.match.findUnique({ where: { id: matchId }, select: volleySelect });
    return NextResponse.json(fresh);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "SET_NOT_OPEN") {
      return NextResponse.json({ error: "No hay un set en curso" }, { status: 409 });
    }
    console.error("[POST /api/tecnico/matches/[matchId]/volley/point]", error);
    return NextResponse.json({ error: "Error al registrar el punto" }, { status: 500 });
  }
}
