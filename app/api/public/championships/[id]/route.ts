import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/championships/[id] — detalle público: info + fixture + equipos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const championship = await prisma.championship.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: { not: "borrador" },
      },
      select: {
        id:              true,
        name:            true,
        slug:            true,
        sport:           true,
        description:     true,
        logoUrl:         true,
        bannerUrl:       true,
        status:          true,
        format:          true,
        startDate:       true,
        endDate:         true,
        location:        true,
        maxEquipos:      true,
        minJugadores:    true,
        matchDurationMin: true,
      },
    });

    if (!championship) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }

    // Equipos inscritos
    const teams = await prisma.team.findMany({
      where: { championshipId: championship.id, status: "activo" },
      select: {
        id:       true,
        name:     true,
        shieldUrl: true,
        _count: { select: { rosterEntries: { where: { status: "inscrito" } } } },
      },
      orderBy: { name: "asc" },
    });

    // Fases
    const phases = await prisma.phase.findMany({
      where: { championshipId: championship.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, type: true, order: true },
    });

    // Partidos con toda la info necesaria para el fixture
    const matches = await prisma.match.findMany({
      where: { championshipId: championship.id },
      include: {
        homeTeam: { select: { id: true, name: true, shieldUrl: true } },
        awayTeam: { select: { id: true, name: true, shieldUrl: true } },
        phase:    { select: { id: true, name: true } },
        jornada:  { select: { id: true, number: true, name: true } },
        group:    { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ championship, teams, phases, matches });
  } catch (error) {
    console.error("[GET /api/public/championships/[id]]", error);
    return NextResponse.json({ error: "Error al obtener campeonato" }, { status: 500 });
  }
}
