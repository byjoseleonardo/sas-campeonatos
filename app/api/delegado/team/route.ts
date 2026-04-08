import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  championshipId: z.string(),
});

// GET /api/delegado/team?championshipId=...
// Retorna el equipo del delegado en un campeonato
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const championshipId = searchParams.get("championshipId");

    const team = await prisma.team.findFirst({
      where: {
        delegateId: session.user.id,
        ...(championshipId ? { championshipId } : {}),
      },
      include: {
        championship: { select: { id: true, name: true, sport: true, minJugadores: true, maxInscripciones: true } },
        _count: { select: { rosterEntries: true } },
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("[GET /api/delegado/team]", error);
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 });
  }
}

// POST /api/delegado/team
// Registra el equipo del delegado en un campeonato
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const data = createTeamSchema.parse(body);

    // Verificar que el campeonato esté en inscripciones
    const championship = await prisma.championship.findUnique({
      where: { id: data.championshipId },
    });
    if (!championship || championship.status !== "inscripciones") {
      return NextResponse.json({ error: "El campeonato no está en período de inscripciones" }, { status: 400 });
    }

    // Verificar que el delegado no tenga equipo en ese campeonato
    const existing = await prisma.team.findFirst({
      where: { delegateId: session.user.id, championshipId: data.championshipId },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya tienes un equipo registrado en este campeonato" }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        championshipId: data.championshipId,
        delegateId: session.user.id,
      },
      include: {
        championship: { select: { id: true, name: true, sport: true, minJugadores: true, maxInscripciones: true } },
        _count: { select: { rosterEntries: true } },
      },
    });

    // Asignar rol delegado con scope del campeonato y equipo
    await prisma.userRole.updateMany({
      where: { userId: session.user.id, role: "delegado" },
      data: { championshipId: data.championshipId, teamId: team.id },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /api/delegado/team]", error);
    return NextResponse.json({ error: "Error al registrar equipo" }, { status: 500 });
  }
}
