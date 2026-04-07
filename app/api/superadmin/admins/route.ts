import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Solo superadmin puede acceder
async function guardSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "superadministrador") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

// GET /api/superadmin/admins — listar todos los admins
export async function GET(req: Request) {
  const guard = await guardSuperAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const admins = await prisma.user.findMany({
    where: {
      userRoles: { some: { role: "administrador" } },
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { paternalLastName: { contains: search, mode: "insensitive" } },
          { maternalLastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(admins);
}

// POST /api/superadmin/admins — crear un admin
export async function POST(req: Request) {
  const guard = await guardSuperAdmin();
  if (guard) return guard;

  const body = await req.json();
  const { firstName, paternalLastName, maternalLastName, email, password } = body;

  if (!firstName || !paternalLastName || !email || !password) {
    return NextResponse.json({ error: "Nombre, apellido paterno, correo y contraseña son requeridos" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      firstName,
      paternalLastName,
      maternalLastName: maternalLastName || null,
      email,
      password: hashed,
      isActive: true,
      mustChangePassword: false,
      userRoles: {
        create: { role: "administrador" },
      },
    },
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(admin, { status: 201 });
}
