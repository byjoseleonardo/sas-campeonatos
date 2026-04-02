import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
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
    const { newPassword } = schema.parse(body);

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
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
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
  }
}
