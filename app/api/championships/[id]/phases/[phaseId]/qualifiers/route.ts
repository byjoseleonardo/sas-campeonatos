import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  return !!(await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  }));
}

// ─── Calcula tabla de posiciones por grupo ────────────────────────────────────

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  qualifies: boolean;
}

async function calcGroupStandings(
  championshipId: string,
  phaseId: string,
  teamsAdvance: number
): Promise<{ groupId: string; groupName: string; standings: TeamStanding[] }[]> {
  const groups = await prisma.group.findMany({
    where: { championshipId },
    include: {
      groupTeams: { include: { team: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const result = [];

  for (const group of groups) {
    const teamIds = group.groupTeams.map((gt) => gt.teamId);

    // Partidos finalizados de esta fase entre equipos del grupo
    const matches = await prisma.match.findMany({
      where: {
        phaseId,
        status: "finalizado",
        homeTeamId: { in: teamIds },
        awayTeamId: { in: teamIds },
      },
    });

    const standings: TeamStanding[] = group.groupTeams.map(({ team }) => {
      let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, points = 0;

      for (const m of matches) {
        if (m.homeTeamId === team.id) {
          played++; gf += m.homeScore; ga += m.awayScore;
          if (m.homeScore > m.awayScore) { won++; points += 3; }
          else if (m.homeScore === m.awayScore) { drawn++; points += 1; }
          else { lost++; }
        }
        if (m.awayTeamId === team.id) {
          played++; gf += m.awayScore; ga += m.homeScore;
          if (m.awayScore > m.homeScore) { won++; points += 3; }
          else if (m.awayScore === m.homeScore) { drawn++; points += 1; }
          else { lost++; }
        }
      }

      return { teamId: team.id, teamName: team.name, played, won, drawn, lost, gf, ga, gd: gf - ga, points, qualifies: false };
    });

    // Ordenar: puntos → GD → GF → nombre
    standings.sort((a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamName.localeCompare(b.teamName)
    );

    // Marcar clasificados
    standings.forEach((s, i) => { s.qualifies = i < teamsAdvance; });

    result.push({ groupId: group.id, groupName: group.name, standings });
  }

  return result;
}

// ─── GET — clasificados calculados y guardados ────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: championshipId, phaseId } = await params;
    if (!(await canManage(session.user.id, session.user.role, championshipId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
    if (!phase || phase.type !== "grupos") {
      return NextResponse.json({ error: "Solo disponible para fases de grupos" }, { status: 400 });
    }

    const [groupStandings, savedQualifiers] = await Promise.all([
      calcGroupStandings(championshipId, phaseId, phase.teamsAdvance ?? 2),
      prisma.phaseQualifier.findMany({
        where: { phaseId },
        include: { team: { select: { id: true, name: true } } },
      }),
    ]);

    return NextResponse.json({
      teamsAdvance: phase.teamsAdvance ?? 2,
      groups: groupStandings,
      savedQualifiers: savedQualifiers.map((q) => ({
        teamId: q.teamId,
        teamName: q.team.name,
        groupName: q.groupName,
        position: q.position,
      })),
    });
  } catch (error) {
    console.error("[GET /qualifiers]", error);
    return NextResponse.json({ error: "Error al obtener clasificados" }, { status: 500 });
  }
}

// ─── PUT — guardar clasificados confirmados ───────────────────────────────────

const saveSchema = z.object({
  qualifiers: z.array(z.object({
    teamId:    z.string(),
    groupName: z.string().optional(),
    position:  z.number().int().min(1),
  })),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: championshipId, phaseId } = await params;
    if (!(await canManage(session.user.id, session.user.role, championshipId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const body = await req.json();
    const { qualifiers } = saveSchema.parse(body);

    // Reemplazar clasificados existentes
    await prisma.phaseQualifier.deleteMany({ where: { phaseId } });
    await prisma.phaseQualifier.createMany({
      data: qualifiers.map((q) => ({
        phaseId,
        teamId:    q.teamId,
        groupName: q.groupName ?? null,
        position:  q.position,
      })),
    });

    return NextResponse.json({ saved: qualifiers.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PUT /qualifiers]", error);
    return NextResponse.json({ error: "Error al guardar clasificados" }, { status: 500 });
  }
}
