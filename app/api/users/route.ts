import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@/lib/generated/prisma/enums";

const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  dni: z.string().optional(),
  role: z.nativeEnum(Role),
  championshipId: z.string().optional(),
  teamId: z.string().optional(),
});

// GET /api/users — listar usuarios con sus roles
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") as Role | null;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          role
            ? { userRoles: { some: { role } } }
            : {},
        ],
      },
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

    // No retornar passwords
    const safeUsers = users.map(({ password: _pw, ...user }) => user);

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// POST /api/users — crear usuario y asignar rol
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);

    // Verificar que el email no exista
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        dni: data.dni,
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
