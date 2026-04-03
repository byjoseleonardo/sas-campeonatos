import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role, PhaseType, EliminacionRound } from "@/lib/generated/prisma/enums";

const updateSchema = z.object({
  name:          z.string().min(1).optional(),
  type:          z.nativeEnum(PhaseType).optional(),
  legsPerMatch:  z.number().int().min(1).max(2).optional(),
  numGroups:     z.number().int().min(1).nullable().optional(),
  teamsPerGroup: z.number().int().min(2).nullable().optional(),
  teamsAdvance:  z.number().int().min(1).nullable().optional(),
  startingRound: z.nativeEnum(EliminacionRound).nullable().optional(),
  hasThirdPlace: z.boolean().optional(),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  const isOrg = await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  });
  return !!isOrg;
}

// PATCH /api/championships/[id]/phases/[phaseId]
export async function PATCH(
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

    const champ = await prisma.championship.findUnique({ where: { id }, select: { status: true } });
    if (champ?.status === "en_curso" || champ?.status === "finalizado") {
      return NextResponse.json({ error: "No se puede modificar un campeonato iniciado" }, { status: 409 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const phase = await prisma.phase.update({
      where: { id: phaseId },
      data,
    });
    return NextResponse.json(phase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /phases/[phaseId]]", error);
    return NextResponse.json({ error: "Error al actualizar fase" }, { status: 500 });
  }
}

// DELETE /api/championships/[id]/phases/[phaseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id, phaseId } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const champ = await prisma.championship.findUnique({ where: { id }, select: { status: true } });
    if (champ?.status === "en_curso" || champ?.status === "finalizado") {
      return NextResponse.json({ error: "No se puede modificar un campeonato iniciado" }, { status: 409 });
    }

    await prisma.phase.delete({ where: { id: phaseId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /phases/[phaseId]]", error);
    return NextResponse.json({ error: "Error al eliminar fase" }, { status: 500 });
  }
}
