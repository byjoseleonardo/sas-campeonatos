import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/championships/[id]/teams
// Retorna todos los equipos del campeonato con sus planillas (solo para admin/organizador)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  // Verificar que es admin o organizador del campeonato
  const isAdmin = session.user.role === "administrador";
  if (!isAdmin) {
    const isOrg = await prisma.userRole.findFirst({
      where: { userId: session.user.id, role: "organizador", championshipId: id },
    });
    if (!isOrg) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
  }

  const teams = await prisma.team.findMany({
    where: { championshipId: id },
    include: {
      rosterEntries: {
        include: {
          player: {
            select: { id: true, dni: true, firstName: true, lastName: true, birthDate: true, gender: true },
          },
        },
        orderBy: { number: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teams);
}
