import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/delegado/championships
// Retorna campeonatos en estado "inscripciones" para que el delegado pueda inscribirse
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const championships = await prisma.championship.findMany({
      where: { status: "inscripciones" },
      select: {
        id: true,
        name: true,
        sport: true,
        format: true,
        location: true,
        startDate: true,
        endDate: true,
        titulares: true,
        suplentes: true,
        minSuplentes: true,
        maxInscripciones: true,
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(championships);
  } catch (error) {
    console.error("[GET /api/delegado/championships]", error);
    return NextResponse.json({ error: "Error al obtener campeonatos" }, { status: 500 });
  }
}
