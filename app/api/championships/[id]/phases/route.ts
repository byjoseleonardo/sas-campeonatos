import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role, PhaseType, EliminacionRound } from "@/lib/generated/prisma/enums";

const phaseSchema = z.object({
  name:          z.string().min(1, "El nombre es requerido"),
  type:          z.nativeEnum(PhaseType),
  order:         z.number().int().min(1),
  legsPerMatch:  z.number().int().min(1).max(2).default(1),
  // grupos
  numGroups:     z.number().int().min(1).optional().nullable(),
  teamsPerGroup: z.number().int().min(2).optional().nullable(),
  teamsAdvance:  z.number().int().min(1).optional().nullable(),
  // eliminacion
  startingRound: z.nativeEnum(EliminacionRound).optional().nullable(),
  hasThirdPlace: z.boolean().default(false),
});

async function canManage(userId: string, role: string, championshipId: string) {
  if (role === Role.administrador) return true;
  const isOrg = await prisma.userRole.findFirst({
    where: { userId, role: Role.organizador, championshipId },
  });
  return !!isOrg;
}

// GET /api/championships/[id]/phases
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    const phases = await prisma.phase.findMany({
      where: { championshipId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(phases);
  } catch (error) {
    console.error("[GET /phases]", error);
    return NextResponse.json({ error: "Error al obtener fases" }, { status: 500 });
  }
}

// POST /api/championships/[id]/phases
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const champ = await prisma.championship.findUnique({ where: { id }, select: { status: true } });
    if (!champ) return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    if (champ.status === "en_curso" || champ.status === "finalizado") {
      return NextResponse.json({ error: "No se puede modificar un campeonato iniciado" }, { status: 409 });
    }

    const body = await req.json();
    const data = phaseSchema.parse(body);

    // Si no se pasa order, asignar el siguiente disponible
    const maxOrder = await prisma.phase.aggregate({
      where: { championshipId: id },
      _max: { order: true },
    });
    const order = data.order ?? (maxOrder._max.order ?? 0) + 1;

    const phase = await prisma.phase.create({
      data: {
        championshipId: id,
        name: data.name,
        type: data.type,
        order,
        legsPerMatch: data.legsPerMatch,
        numGroups: data.numGroups ?? null,
        teamsPerGroup: data.teamsPerGroup ?? null,
        teamsAdvance: data.teamsAdvance ?? null,
        startingRound: data.startingRound ?? null,
        hasThirdPlace: data.hasThirdPlace,
      },
    });
    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /phases]", error);
    return NextResponse.json({ error: "Error al crear fase" }, { status: 500 });
  }
}

// PATCH /api/championships/[id]/phases — reordenar (body: [{ id, order }])
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!await canManage(session.user.id, session.user.role, id)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const body: { id: string; order: number }[] = await req.json();
    await Promise.all(
      body.map(({ id: phaseId, order }) =>
        prisma.phase.update({ where: { id: phaseId }, data: { order } })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /phases]", error);
    return NextResponse.json({ error: "Error al reordenar fases" }, { status: 500 });
  }
}
