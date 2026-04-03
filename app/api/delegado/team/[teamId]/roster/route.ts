import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const addPlayerSchema = z.object({
  dni: z.string().min(6, "DNI inválido"),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  number: z.number().int().min(1).max(99),
  position: z.string().min(1, "La posición es requerida"),
});

// GET /api/delegado/team/[teamId]/roster
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { teamId } = await params;

    // Verificar que el equipo pertenece al delegado
    const team = await prisma.team.findFirst({
      where: { id: teamId, delegateId: session.user.id },
    });
    if (!team) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    const roster = await prisma.rosterEntry.findMany({
      where: { teamId },
      include: {
        player: {
          select: { id: true, dni: true, firstName: true, lastName: true, birthDate: true, gender: true },
        },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(roster);
  } catch (error) {
    console.error("[GET /api/delegado/team/[teamId]/roster]", error);
    return NextResponse.json({ error: "Error al obtener plantel" }, { status: 500 });
  }
}

// POST /api/delegado/team/[teamId]/roster
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { teamId } = await params;

    // Verificar que el equipo pertenece al delegado
    const team = await prisma.team.findFirst({
      where: { id: teamId, delegateId: session.user.id },
      include: {
        championship: true,
        _count: { select: { rosterEntries: true } },
      },
    });
    if (!team) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    // Verificar límite de inscripciones
    if (team._count.rosterEntries >= team.championship.maxInscripciones) {
      return NextResponse.json(
        { error: `Se alcanzó el límite de ${team.championship.maxInscripciones} jugadores` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = addPlayerSchema.parse(body);

    // Verificar que el número no esté ocupado en el equipo
    const numberTaken = await prisma.rosterEntry.findFirst({
      where: { teamId, number: data.number },
    });
    if (numberTaken) {
      return NextResponse.json({ error: `El número ${data.number} ya está asignado` }, { status: 409 });
    }

    // Crear o encontrar jugador por DNI
    let player = await prisma.player.findUnique({ where: { dni: data.dni } });
    if (!player) {
      player = await prisma.player.create({
        data: {
          dni: data.dni,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          gender: data.gender,
        },
      });
    }

    // Verificar que el jugador no esté ya en el equipo
    const alreadyInTeam = await prisma.rosterEntry.findFirst({
      where: { playerId: player.id, teamId },
    });
    if (alreadyInTeam) {
      return NextResponse.json({ error: "El jugador ya está inscrito en este equipo" }, { status: 409 });
    }

    const entry = await prisma.rosterEntry.create({
      data: {
        playerId: player.id,
        teamId,
        number: data.number,
        position: data.position,
        status: "inscrito",
      },
      include: {
        player: {
          select: { id: true, dni: true, firstName: true, lastName: true, birthDate: true, gender: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /api/delegado/team/[teamId]/roster]", error);
    return NextResponse.json({ error: "Error al inscribir jugador" }, { status: 500 });
  }
}
