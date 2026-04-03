import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  name:        z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:       z.string().email("Correo electrónico inválido"),
  phone:       z.string().optional(),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// PATCH /api/delegado/change-password
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, newPassword } = schema.parse(body);

    // Verificar que el email no esté en uso por otro usuario
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está en uso" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email,
        phone: phone || null,
        password: hashed,
        mustChangePassword: false,
        tempPassword: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/delegado/change-password]", error);
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 });
  }
}
