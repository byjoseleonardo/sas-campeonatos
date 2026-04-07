import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function guardSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "superadministrador") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

// PATCH /api/superadmin/admins/[id] — editar nombre, email, password o isActive
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();
  const { firstName, paternalLastName, maternalLastName, email, password, isActive } = body;

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (paternalLastName !== undefined) data.paternalLastName = paternalLastName;
  if (maternalLastName !== undefined) data.maternalLastName = maternalLastName;
  if (isActive !== undefined) data.isActive = isActive;

  if (email !== undefined) {
    const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (conflict) return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
    data.email = email;
  }

  if (password) {
    data.password = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
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

  return NextResponse.json(updated);
}

// DELETE /api/superadmin/admins/[id] — eliminar admin
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin();
  if (guard) return guard;

  const { id } = await params;

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
