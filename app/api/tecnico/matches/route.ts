import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@/lib/generated/prisma/enums";

// GET /api/tecnico/matches — partidos de los campeonatos asignados al técnico
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (session.user.role !== Role.tecnico) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

    // Campeonatos asignados al técnico
    const roles = await prisma.userRole.findMany({
      where: { userId: session.user.id, role: Role.tecnico },
      select: { championshipId: true },
    });

    const championshipIds = roles
      .map((r) => r.championshipId)
      .filter(Boolean) as string[];

    if (championshipIds.length === 0) return NextResponse.json([]);

    const matches = await prisma.match.findMany({
      where: { championshipId: { in: championshipIds } },
      include: {
        homeTeam:    { select: { id: true, name: true } },
        awayTeam:    { select: { id: true, name: true } },
        championship: { select: { id: true, name: true } },
        phase:        { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("[GET /api/tecnico/matches]", error);
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 500 });
  }
}
