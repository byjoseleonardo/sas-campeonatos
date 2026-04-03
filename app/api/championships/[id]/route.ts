import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Sport, ChampionshipFormat, ChampionshipStatus, Role } from "@/lib/generated/prisma/enums";

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  sport: z.nativeEnum(Sport).optional(),
  format: z.nativeEnum(ChampionshipFormat).optional(),
  status: z.nativeEnum(ChampionshipStatus).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  matchDurationMin: z.number().int().min(1).optional(),
  titulares: z.number().int().min(1).optional(),
  suplentes: z.number().int().min(0).optional(),
  maxInscripciones: z.number().int().min(1).optional(),
  maxEquipos: z.number().int().min(0).optional(),
  minSuplentes: z.number().int().min(0).optional(),
  organizadorId: z.string().nullable().optional(),
  tecnicoIds: z.array(z.string()).optional(),
});

// GET /api/championships/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const championship = await prisma.championship.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        userRoles: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { teams: true } },
      },
    });

    if (!championship) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }

    return NextResponse.json(championship);
  } catch (error) {
    console.error("[GET /api/championships/[id]]", error);
    return NextResponse.json({ error: "Error al obtener campeonato" }, { status: 500 });
  }
}

// PATCH /api/championships/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    // El organizador solo puede cambiar el estado de sus campeonatos
    const isAdmin = session.user.role === "administrador";
    const isStatusOnly = Object.keys(body).length === 1 && "status" in body;
    if (!isAdmin && !isStatusOnly) {
      return NextResponse.json({ error: "Solo el administrador puede editar campeonatos" }, { status: 403 });
    }

    const existing = await prisma.championship.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }

    const { organizadorId, tecnicoIds, startDate, endDate, ...fields } = data;

    const championship = await prisma.championship.update({
      where: { id },
      data: {
        ...fields,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { teams: true } },
      },
    });

    // Actualizar asignación de organizador
    if (organizadorId !== undefined) {
      // Desasignar organizador anterior
      await prisma.userRole.updateMany({
        where: { championshipId: id, role: Role.organizador },
        data: { championshipId: null },
      });
      if (organizadorId) {
        await prisma.userRole.updateMany({
          where: { userId: organizadorId, role: Role.organizador },
          data: { championshipId: id },
        });
      }
    }

    // Actualizar técnicos asignados
    if (tecnicoIds !== undefined) {
      await prisma.userRole.updateMany({
        where: { championshipId: id, role: Role.tecnico },
        data: { championshipId: null },
      });
      if (tecnicoIds.length) {
        await prisma.userRole.updateMany({
          where: { userId: { in: tecnicoIds }, role: Role.tecnico },
          data: { championshipId: id },
        });
      }
    }

    // Desactivar cuentas de delegado cuando el campeonato finaliza
    if (data.status === ChampionshipStatus.finalizado) {
      const delegadoRoles = await prisma.userRole.findMany({
        where: { championshipId: id, role: Role.delegado },
        select: { userId: true },
      });
      if (delegadoRoles.length) {
        await prisma.user.updateMany({
          where: { id: { in: delegadoRoles.map((r) => r.userId) } },
          data: { isActive: false },
        });
      }
    }

    return NextResponse.json(championship);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/championships/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar campeonato" }, { status: 500 });
  }
}

// DELETE /api/championships/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "administrador") {
      return NextResponse.json({ error: "Solo el administrador puede eliminar campeonatos" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.championship.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }

    await prisma.championship.delete({ where: { id } });
    return NextResponse.json({ message: "Campeonato eliminado correctamente" });
  } catch (error) {
    console.error("[DELETE /api/championships/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar campeonato" }, { status: 500 });
  }
}
