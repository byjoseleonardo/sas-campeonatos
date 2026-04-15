import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface CipDetalleResponse {
  vPrimerApellido?: string;
  vSegundoApellido?: string;
  vNombres?: string;
  vSede?: string;
  vEstado?: string;
  vEstadoCol?: string;
  listaFormacion?: { vEspecialidad?: string }[];
}

interface CipApiResponse {
  success: boolean;
  data?: {
    cip?: string;
    especialidad?: string;
    sede?: string;
    estado?: string;
  };
  detalle?: CipDetalleResponse;
}

const CIP_API_URL = process.env.CIP_API_URL!;
const CIP_API_KEY = process.env.CIP_API_KEY!;

const toTitle = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// GET /api/players/lookup?dni=...  (dni contiene el número CIP)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cip = req.nextUrl.searchParams.get("dni")?.trim();
  if (!cip || cip.length < 4) {
    return NextResponse.json({ error: "N° CIP inválido" }, { status: 400 });
  }

  // 1. Buscar en base de datos local primero
  const player = await prisma.player.findUnique({
    where: { dni: cip },
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

  // 2. Consultar API del CIP
  try {
    const res = await fetch(CIP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CIP_API_KEY,
      },
      body: JSON.stringify({ numeroCip: cip }),
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json(null);

    const data: CipApiResponse = await res.json();

    if (!data.success || !data.detalle) return NextResponse.json(null);

    const { vPrimerApellido, vSegundoApellido, vNombres, vSede, vEstado, vEstadoCol, listaFormacion } = data.detalle;

    if (!vNombres || !vPrimerApellido) return NextResponse.json(null);

    const especialidad = listaFormacion?.[0]?.vEspecialidad ?? data.data?.especialidad ?? null;

    return NextResponse.json({
      source: "external",
      firstName: toTitle(vNombres),
      paternalLastName: toTitle(vPrimerApellido),
      maternalLastName: vSegundoApellido ? toTitle(vSegundoApellido) : null,
      gender: null,
      // Datos extra del CIP
      especialidad: especialidad ? toTitle(especialidad) : null,
      sede: vSede ? toTitle(vSede) : null,
      estado: vEstado ?? null,
      estadoCol: vEstadoCol ?? null,
    });
  } catch {
    return NextResponse.json(null);
  }
}
