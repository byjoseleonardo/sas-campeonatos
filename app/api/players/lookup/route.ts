import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/players/lookup?dni=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dni = req.nextUrl.searchParams.get("dni")?.trim();
  if (!dni || dni.length < 6) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { dni },
    select: { firstName: true, lastName: true, birthDate: true, gender: true },
  });

  if (!player) return NextResponse.json(null);

  return NextResponse.json({
    firstName: player.firstName,
    lastName: player.lastName,
    birthDate: player.birthDate ? player.birthDate.toISOString().slice(0, 10) : null,
    gender: player.gender,
  });
}
