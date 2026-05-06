import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const matchSchema = z.object({
  homeTeamId:  z.string(),
  awayTeamId:  z.string(),
  scheduledAt: z.string().nullable().optional(),
  venue:       z.string().nullable().optional(),
  roundLabel:  z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  matches: z.array(matchSchema).min(1),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  return !!(await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  }));
}

// POST /api/championships/[id]/phases/[phaseId]/matches/bulk
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: championshipId, phaseId } = await params;

    if (!(await canManage(session.user.id, session.user.role, championshipId))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const body = await req.json();
    const { matches } = bulkSchema.parse(body);

    const created = await prisma.$transaction(
      matches.map((m) =>
        prisma.match.create({
          data: {
            championshipId,
            phaseId,
            homeTeamId:  m.homeTeamId,
            awayTeamId:  m.awayTeamId,
            scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null,
            venue:       m.venue ?? null,
            roundLabel:  m.roundLabel ?? null,
            supervisorId: m.supervisorId ?? null,
            status: "programado",
          },
        })
      )
    );

    return NextResponse.json({ created: created.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /matches/bulk]", error);
    return NextResponse.json({ error: "Error al crear partidos" }, { status: 500 });
  }
}
