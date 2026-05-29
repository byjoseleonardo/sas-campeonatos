import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const updateSchema = z.object({
  homeTeamId:   z.string().optional(),
  awayTeamId:   z.string().optional(),
  scheduledAt:  z.string().nullable().optional(),
  venue:        z.string().nullable().optional(),
  roundLabel:   z.string().nullable().optional(),
  homeScore:    z.number().int().min(0).optional(),
  awayScore:    z.number().int().min(0).optional(),
  status:       z.enum(["programado", "en_curso", "finalizado", "suspendido", "postergado"]).optional(),
  supervisorId: z.string().nullable().optional(),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  const isOrg = await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  });
  return !!isOrg;
}

// PATCH /api/championships/[id]/phases/[phaseId]/matches/[matchId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string; matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id, matchId } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.homeTeamId && data.awayTeamId && data.homeTeamId === data.awayTeamId) {
      return NextResponse.json({ error: "Los equipos no pueden ser iguales" }, { status: 400 });
    }

    // Estado actual del partido (para validaciones de llave)
    const current = await prisma.match.findUnique({
      where: { id: matchId },
      select: { round: true, phaseId: true, homeTeamId: true, awayTeamId: true },
    });
    if (!current) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    // ── Validación de llave: un equipo no puede estar en ambas semifinales ──
    if (current.round === "semifinal" && current.phaseId && (data.homeTeamId || data.awayTeamId)) {
      const newHome = data.homeTeamId ?? current.homeTeamId;
      const newAway = data.awayTeamId ?? current.awayTeamId;

      const siblings = await prisma.match.findMany({
        where: { phaseId: current.phaseId, round: "semifinal", id: { not: matchId } },
        select: { homeTeamId: true, awayTeamId: true },
      });
      const usedElsewhere = new Set(
        siblings.flatMap((s) => [s.homeTeamId, s.awayTeamId]).filter((x): x is string => !!x)
      );

      const conflict = [newHome, newAway].find((t) => t && usedElsewhere.has(t));
      if (conflict) {
        return NextResponse.json(
          { error: "Ese equipo ya está asignado en la otra semifinal" },
          { status: 409 }
        );
      }
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(data.homeTeamId    && { homeTeamId: data.homeTeamId }),
        ...(data.awayTeamId    && { awayTeamId: data.awayTeamId }),
        ...(data.scheduledAt   !== undefined && { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }),
        ...(data.venue         !== undefined && { venue: data.venue }),
        ...(data.roundLabel    !== undefined && { roundLabel: data.roundLabel }),
        ...(data.homeScore     !== undefined && { homeScore: data.homeScore }),
        ...(data.awayScore     !== undefined && { awayScore: data.awayScore }),
        ...(data.status        && { status: data.status }),
        ...(data.supervisorId  !== undefined && { supervisorId: data.supervisorId }),
      },
      include: {
        homeTeam:   { select: { id: true, name: true } },
        awayTeam:   { select: { id: true, name: true } },
        supervisor: { select: { id: true, firstName: true, paternalLastName: true } },
      },
    });
    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /phases/matches/[matchId]]", error);
    return NextResponse.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}

// DELETE /api/championships/[id]/phases/[phaseId]/matches/[matchId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string; matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id, matchId } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true } });
    if (match?.status === "en_curso" || match?.status === "finalizado") {
      return NextResponse.json({ error: "No se puede eliminar un partido en curso o finalizado" }, { status: 409 });
    }

    await prisma.match.delete({ where: { id: matchId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /phases/matches/[matchId]]", error);
    return NextResponse.json({ error: "Error al eliminar partido" }, { status: 500 });
  }
}
