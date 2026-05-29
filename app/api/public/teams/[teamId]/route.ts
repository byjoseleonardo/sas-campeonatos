import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/teams/[teamId] — equipo + planilla pública (solo campeonatos no borrador)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const team = await prisma.team.findFirst({
      where: { id: teamId, championship: { status: { not: "borrador" } } },
      select: {
        id: true,
        name: true,
        shieldUrl: true,
        championship: { select: { id: true, name: true, slug: true, sport: true } },
        delegate: {
          select: { firstName: true, paternalLastName: true, maternalLastName: true },
        },
        rosterEntries: {
          where: { status: "inscrito" },
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            position: true,
            photoUrl: true,
            player: {
              select: {
                firstName: true,
                paternalLastName: true,
                maternalLastName: true,
                dni: true, // contiene el N° CIP
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("[GET /api/public/teams/[teamId]]", error);
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 });
  }
}
