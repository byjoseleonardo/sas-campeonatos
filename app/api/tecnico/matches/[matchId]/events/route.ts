import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role, EventType } from "@/lib/generated/prisma/enums";

async function canAccessMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { championshipId: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return null;
  const role = await prisma.userRole.findFirst({
    where: { userId, role: Role.tecnico_mesa, championshipId: match.championshipId },
  });
  return role ? match : null;
}

// Recalcula homeScore/awayScore desde los eventos de gol
async function recalcScore(matchId: string, homeTeamId: string) {
  const events = await prisma.matchEvent.findMany({
    where: { matchId, eventType: { in: [EventType.gol, EventType.gol_en_contra] } },
  });

  let homeScore = 0, awayScore = 0;
  for (const e of events) {
    if (e.eventType === EventType.gol) {
      if (e.teamId === homeTeamId) homeScore++; else awayScore++;
    } else {
      // gol en contra: beneficia al rival
      if (e.teamId === homeTeamId) awayScore++; else homeScore++;
    }
  }

  await prisma.match.update({ where: { id: matchId }, data: { homeScore, awayScore } });
  return { homeScore, awayScore };
}

const SCORE_EVENTS = new Set<string>([EventType.gol, EventType.gol_en_contra]);

const eventSchema = z.object({
  eventType: z.enum(["gol", "gol_en_contra", "amarilla", "roja", "roja_directa"]),
  teamId:    z.string(),
  playerId:  z.string(),
  minute:    z.number().int().min(1).max(200),
});

// POST /api/tecnico/matches/[matchId]/events
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { matchId } = await params;
    const match = await canAccessMatch(session.user.id, matchId);
    if (!match) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

    const current = await prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true },
    });
    if (current?.status !== "en_curso") {
      return NextResponse.json({ error: "Solo se pueden registrar eventos con el partido en curso" }, { status: 409 });
    }

    const body = await req.json();
    const data = eventSchema.parse(body);

    if (data.teamId !== match.homeTeamId && data.teamId !== match.awayTeamId) {
      return NextResponse.json({ error: "Equipo no pertenece a este partido" }, { status: 400 });
    }

    const event = await prisma.matchEvent.create({
      data: {
        matchId,
        teamId:       data.teamId,
        playerId:     data.playerId,
        eventType:    data.eventType as EventType,
        minute:       data.minute,
        recordedById: session.user.id,
      },
      include: {
        player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true } },
        team:   { select: { id: true, name: true } },
      },
    });

    // Recalcular marcador si es gol
    let score: { homeScore: number; awayScore: number } | null = null;
    if (SCORE_EVENTS.has(data.eventType as EventType)) {
      score = await recalcScore(matchId, match.homeTeamId);
    }

    return NextResponse.json({ event, score }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /events]", error);
    return NextResponse.json({ error: "Error al registrar evento" }, { status: 500 });
  }
}
