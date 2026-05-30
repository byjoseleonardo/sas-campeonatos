import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  paternalLastName: z.string().min(2).optional(),
  maternalLastName: z.string().nullable().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
  championshipId: z.string().nullable().optional(),
  championshipIds: z.array(z.string()).optional(), // multi-campeonato (técnicos)
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
    const { role, championshipId, championshipIds, teamId, password, ...userFields } = data;

    const updateData: Record<string, unknown> = { ...userFields };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
      // El admin asigna una contraseña definitiva: ya no se fuerza el cambio
      // (evita el loop de redirección a /delegado/cambiar-password para no-delegados).
      updateData.mustChangePassword = false;
      updateData.tempPassword = null;
    }

    await prisma.user.update({ where: { id }, data: updateData });

    if (championshipIds !== undefined) {
      // Multi-campeonato: reemplaza TODAS las asignaciones de este rol por la
      // selección actual (uno por campeonato; o "sin asignar" si está vacío).
      const syncRole = role ?? Role.tecnico_mesa;
      await prisma.userRole.deleteMany({ where: { userId: id, role: syncRole } });
      await prisma.userRole.createMany({
        data:
          championshipIds.length > 0
            ? championshipIds.map((cid) => ({ userId: id, role: syncRole, championshipId: cid, teamId: teamId || null }))
            : [{ userId: id, role: syncRole, championshipId: null, teamId: teamId || null }],
      });
    } else if (role !== undefined) {
      // Compatibilidad: actualización de un único rol (championshipId simple).
      const existingRole = await prisma.userRole.findFirst({ where: { userId: id } });
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

    // Re-leer con los roles ya sincronizados para la respuesta.
    const fresh = await prisma.user.findUnique({
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

    const { password: _pw, ...safeUser } = fresh!;
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
