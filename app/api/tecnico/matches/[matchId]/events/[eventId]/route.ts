import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role, EventType } from "@/lib/generated/prisma/enums";

async function canAccessMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { championshipId: true, homeTeamId: true },
  });
  if (!match) return null;
  const role = await prisma.userRole.findFirst({
    where: { userId, role: Role.tecnico, championshipId: match.championshipId },
  });
  return role ? match : null;
}

async function recalcScore(matchId: string, homeTeamId: string) {
  const events = await prisma.matchEvent.findMany({
    where: { matchId, eventType: { in: [EventType.gol, EventType.gol_en_contra] } },
  });
  let homeScore = 0, awayScore = 0;
  for (const e of events) {
    if (e.eventType === EventType.gol) {
      if (e.teamId === homeTeamId) homeScore++; else awayScore++;
    } else {
      if (e.teamId === homeTeamId) awayScore++; else homeScore++;
    }
  }
  await prisma.match.update({ where: { id: matchId }, data: { homeScore, awayScore } });
  return { homeScore, awayScore };
}

// DELETE /api/tecnico/matches/[matchId]/events/[eventId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { matchId, eventId } = await params;
    const match = await canAccessMatch(session.user.id, matchId);
    if (!match) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

    const event = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matchId !== matchId) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    await prisma.matchEvent.delete({ where: { id: eventId } });

    // Recalcular marcador si era gol
    const affectsScore = event.eventType === EventType.gol || event.eventType === EventType.gol_en_contra;
    const score = affectsScore ? await recalcScore(matchId, match.homeTeamId) : null;

    return NextResponse.json({ ok: true, score });
  } catch (error) {
    console.error("[DELETE /events/[eventId]]", error);
    return NextResponse.json({ error: "Error al eliminar evento" }, { status: 500 });
  }
}
