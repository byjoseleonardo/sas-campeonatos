import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/dashboard — stats del admin autenticado
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminId = session.user.id;

    // Campeonatos del admin
    const championships = await prisma.championship.findMany({
      where: { adminId },
      select: {
        id: true, name: true, status: true, sport: true,
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Conteos de roles en los campeonatos del admin
    const champIds = championships.map((c) => c.id);

    const [tecnicos, delegados, supervisores] = await Promise.all([
      prisma.userRole.count({ where: { role: "tecnico_mesa", championshipId: { in: champIds } } }),
      prisma.userRole.count({ where: { role: "delegado",     championshipId: { in: champIds } } }),
      prisma.userRole.count({ where: { role: "supervisor",   championshipId: { in: champIds } } }),
    ]);

    // Usuarios recientes asignados a este admin
    const recentUsers = await prisma.user.findMany({
      where: { adminId },
      select: {
        id: true, firstName: true, paternalLastName: true, email: true,
        userRoles: { select: { role: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Partidos en curso
    const liveMatches = await prisma.match.count({
      where: { championshipId: { in: champIds }, status: "en_curso" },
    });

    return NextResponse.json({
      championships,
      stats: {
        total:       championships.length,
        tecnicos,
        delegados,
        supervisores,
        liveMatches,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}
