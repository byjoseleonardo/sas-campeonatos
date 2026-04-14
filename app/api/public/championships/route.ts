import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/championships — lista pública de campeonatos (excluye borradores)
export async function GET() {
  try {
    const championships = await prisma.championship.findMany({
      where: {
        status: { not: "borrador" },
      },
      select: {
        id:          true,
        name:        true,
        slug:        true,
        sport:       true,
        description: true,
        logoUrl:     true,
        bannerUrl:   true,
        status:      true,
        format:      true,
        startDate:   true,
        endDate:     true,
        location:    true,
        maxEquipos:  true,
        _count: {
          select: { teams: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { startDate: "desc" },
      ],
    });

    return NextResponse.json(championships);
  } catch (error) {
    console.error("[GET /api/public/championships]", error);
    return NextResponse.json({ error: "Error al obtener campeonatos" }, { status: 500 });
  }
}
