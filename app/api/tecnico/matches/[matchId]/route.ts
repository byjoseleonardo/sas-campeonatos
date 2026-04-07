import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

async function canAccessMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { championshipId: true },
  });
  if (!match) return null;
  const role = await prisma.userRole.findFirst({
    where: { userId, role: Role.tecnico_mesa, championshipId: match.championshipId },
  });
  return role ? match : null;
}

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
        championship: { select: { id: true, name: true } },
        phase:        { select: { id: true, name: true } },
        events: {
          include: {
            player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true } },
            team:   { select: { id: true, name: true } },
          },
          orderBy: { minute: "asc" },
        },
      },
    });

    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    // Planillas de ambos equipos
    const rosters = await prisma.rosterEntry.findMany({
      where: {
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
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
  z.object({ action: z.literal("finalizar") }),
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
      select: { status: true, homeTeamId: true, awayTeamId: true },
    });
    if (!current) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    let updateData: Record<string, unknown> = {};

    if (data.action === "iniciar") {
      if (current.status !== "programado" && current.status !== "postergado") {
        return NextResponse.json({ error: "El partido ya fue iniciado" }, { status: 409 });
      }
      updateData = { status: "en_curso", startedAt: new Date() };
    }

    if (data.action === "finalizar") {
      if (current.status !== "en_curso") {
        return NextResponse.json({ error: "El partido no está en curso" }, { status: 409 });
      }
      updateData = { status: "finalizado", endedAt: new Date() };
    }

    if (data.action === "walkover") {
      if (current.status === "finalizado") {
        return NextResponse.json({ error: "El partido ya está finalizado" }, { status: 409 });
      }
      const isHome = data.winnerTeamId === current.homeTeamId;
      updateData = {
        status:    "finalizado",
        homeScore: isHome ? 3 : 0,
        awayScore: isHome ? 0 : 3,
        endedAt:   new Date(),
        roundLabel: undefined, // no cambia
      };
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
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
