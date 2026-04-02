import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

// GET /api/championships/[id]/cupos
// Solo el organizador asignado a ese campeonato (o administrador) puede ver los cupos
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el usuario es organizador de este campeonato o administrador
    if (session.user.role !== Role.administrador) {
      const isOrg = await prisma.userRole.findFirst({
        where: { userId: session.user.id, role: Role.organizador, championshipId: id },
      });
      if (!isOrg) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      }
    }

    const cupos = await prisma.userRole.findMany({
      where: { championshipId: id, role: Role.delegado },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tempPassword: true,
            isActive: true,
            mustChangePassword: true,
            assignedTo: true,
            assignedAt: true,
          },
        },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(cupos);
  } catch (error) {
    console.error("[GET /api/championships/[id]/cupos]", error);
    return NextResponse.json({ error: "Error al obtener cupos" }, { status: 500 });
  }
}

// PATCH /api/championships/[id]/cupos/[userId] is handled in the sub-route
// This endpoint handles bulk or general cupo actions

const assignSchema = z.object({
  userId: z.string(),
  assignedTo: z.string().min(1),
});

// PATCH /api/championships/[id]/cupos — assign a cupo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    if (session.user.role !== Role.administrador) {
      const isOrg = await prisma.userRole.findFirst({
        where: { userId: session.user.id, role: Role.organizador, championshipId: id },
      });
      if (!isOrg) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { userId, assignedTo } = assignSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        assignedTo,
        assignedAt: new Date(),
      },
      select: {
        id: true,
        assignedTo: true,
        assignedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/championships/[id]/cupos]", error);
    return NextResponse.json({ error: "Error al asignar cupo" }, { status: 500 });
  }
}
