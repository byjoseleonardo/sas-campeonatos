import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  paternalLastName: z.string().min(2).optional(),
  maternalLastName: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
  championshipId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
});

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            championship: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("[GET /api/users/[id]]", error);
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
  }
}

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Verificar que existe
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Separar datos del usuario de datos del rol
    const { role, championshipId, teamId, password, ...userFields } = data;

    const updateData: Record<string, unknown> = { ...userFields };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          include: {
            championship: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Si se envia un nuevo rol, actualizar o crear el UserRole
    if (role !== undefined) {
      const existingRole = user.userRoles[0];
      if (existingRole) {
        await prisma.userRole.update({
          where: { id: existingRole.id },
          data: {
            role,
            championshipId: championshipId ?? existingRole.championshipId,
            teamId: teamId ?? existingRole.teamId,
          },
        });
      } else {
        await prisma.userRole.create({
          data: { userId: id, role, championshipId: championshipId || null, teamId: teamId || null },
        });
      }
    }

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/users/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
