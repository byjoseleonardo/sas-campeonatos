import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/matches — todos los partidos de campeonatos públicos
export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      where: {
        championship: { status: { not: "borrador" } },
      },
      include: {
        homeTeam:     { select: { id: true, name: true } },
        awayTeam:     { select: { id: true, name: true } },
        championship: { select: { id: true, name: true } },
        phase:        { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("[GET /api/public/matches]", error);
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 500 });
  }
}
