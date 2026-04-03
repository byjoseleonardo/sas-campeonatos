import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/championships/[id]/groups
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const groups = await prisma.group.findMany({
      where: { championshipId: id },
      include: {
        groupTeams: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        teams: g.groupTeams.map((gt) => gt.team),
      }))
    );
  } catch (error) {
    console.error("[GET /groups]", error);
    return NextResponse.json({ error: "Error al obtener grupos" }, { status: 500 });
  }
}
