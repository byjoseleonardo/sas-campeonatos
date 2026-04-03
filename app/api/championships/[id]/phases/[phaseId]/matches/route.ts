import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const matchSchema = z.object({
  homeTeamId:  z.string().min(1, "Equipo local requerido"),
  awayTeamId:  z.string().min(1, "Equipo visitante requerido"),
  scheduledAt: z.string().optional().nullable(),
  venue:       z.string().optional().nullable(),
  roundLabel:  z.string().optional().nullable(),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  const isOrg = await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  });
  return !!isOrg;
}

// GET /api/championships/[id]/phases/[phaseId]/matches
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { phaseId } = await params;
    const matches = await prisma.match.findMany({
      where: { phaseId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [{ roundLabel: "asc" }, { scheduledAt: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(matches);
  } catch (error) {
    console.error("[GET /phases/matches]", error);
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 500 });
  }
}

// POST /api/championships/[id]/phases/[phaseId]/matches
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id, phaseId } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const body = await req.json();
    const data = matchSchema.parse(body);

    if (data.homeTeamId === data.awayTeamId) {
      return NextResponse.json({ error: "Los equipos no pueden ser iguales" }, { status: 400 });
    }

    const match = await prisma.match.create({
      data: {
        championshipId: id,
        phaseId,
        homeTeamId:  data.homeTeamId,
        awayTeamId:  data.awayTeamId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        venue:       data.venue ?? null,
        roundLabel:  data.roundLabel ?? null,
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /phases/matches]", error);
    return NextResponse.json({ error: "Error al crear partido" }, { status: 500 });
  }
}
