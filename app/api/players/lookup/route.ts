import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface DniApiResponse {
  success: boolean;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  message?: string;
}

// GET /api/players/lookup?dni=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dni = req.nextUrl.searchParams.get("dni")?.trim();
  if (!dni || dni.length < 6) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  // 1. Buscar en base de datos local primero
  const player = await prisma.player.findUnique({
    where: { dni },
    select: { firstName: true, paternalLastName: true, maternalLastName: true, gender: true },
  });

  if (player) {
    return NextResponse.json({
      source: "local",
      firstName: player.firstName,
      paternalLastName: player.paternalLastName,
      maternalLastName: player.maternalLastName,
      gender: player.gender,
    });
  }

  // 2. Consultar API externa si el DNI tiene exactamente 8 dígitos (DNI peruano)
  const token = process.env.DNI_API_TOKEN;
  if (!token || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
    return NextResponse.json(null);
  }

  try {
    const res = await fetch(
      `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${token}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) return NextResponse.json(null);

    const data: DniApiResponse = await res.json();

    if (!data.success || !data.nombres || !data.apellidoPaterno) {
      return NextResponse.json(null);
    }

    // La API devuelve los nombres en mayúsculas, los normalizamos
    const toTitle = (s: string) =>
      s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    return NextResponse.json({
      source: "external",
      firstName: toTitle(data.nombres),
      paternalLastName: toTitle(data.apellidoPaterno),
      maternalLastName: data.apellidoMaterno ? toTitle(data.apellidoMaterno) : null,
      gender: null,
    });
  } catch {
    // Si la API externa falla, simplemente retornamos null (no encontrado)
    return NextResponse.json(null);
  }
}
