import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const createUserSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  paternalLastName: z.string().min(2, "El apellido paterno debe tener al menos 2 caracteres"),
  maternalLastName: z.string().optional(),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  dni: z.string().optional(),
  role: z.nativeEnum(Role),
  championshipId: z.string().optional(),
  teamId: z.string().optional(),
});

// GET /api/users — listar usuarios con sus roles
// - Admin: solo ve sus organizadores (adminId = session.user.id)
// - Organizador: solo ve técnicos de mesa de sus campeonatos
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") as Role | null;
    const callerRole = session.user.role as Role;
    const callerId = session.user.id;

    let where: Record<string, unknown> = {};

    if (callerRole === Role.administrador) {
      // Admin solo ve sus propios organizadores
      where = {
        adminId: callerId,
        ...(roleFilter ? { userRoles: { some: { role: roleFilter } } } : { userRoles: { some: { role: Role.organizador } } }),
      };
    } else if (callerRole === Role.organizador) {
      // Organizador ve técnicos de mesa del mismo tenant (adminId)
      const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { adminId: true } });
      // Si no tiene adminId (caso anómalo), solo ve usuarios creados directamente por él
      const tenantId = caller?.adminId ?? callerId;
      where = {
        adminId: tenantId,
        userRoles: { some: { role: roleFilter ?? Role.tecnico_mesa } },
      };
    }
    // Superadmin ve todo (sin filtro adicional)

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { paternalLastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: {
            championship: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map(({ password: _pw, ...user }) => user);
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// POST /api/users — crear usuario y asignar rol
// - Admin puede crear organizadores (auto-asigna adminId = session.user.id)
// - Organizador puede crear técnicos de mesa
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const callerRole = session.user.role as Role;
    const callerId = session.user.id;

    const body = await req.json();
    const data = createUserSchema.parse(body);

    // Guardia de roles
    if (callerRole === Role.administrador && data.role !== Role.organizador) {
      return NextResponse.json({ error: "El administrador solo puede crear organizadores" }, { status: 403 });
    }
    if (callerRole === Role.organizador && data.role !== Role.tecnico_mesa) {
      return NextResponse.json({ error: "El organizador solo puede crear técnicos de mesa" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Determinar adminId del nuevo usuario
    let adminId: string | null = null;
    if (callerRole === Role.administrador) {
      adminId = callerId;
    } else if (callerRole === Role.organizador) {
      const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { adminId: true } });
      adminId = caller?.adminId ?? null;
    }

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        paternalLastName: data.paternalLastName,
        maternalLastName: data.maternalLastName || null,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        dni: data.dni,
        adminId,
        userRoles: {
          create: {
            role: data.role,
            championshipId: data.championshipId || null,
            teamId: data.teamId || null,
          },
        },
      },
      include: {
        userRoles: {
          include: {
            championship: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
