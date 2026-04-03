import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { Sport, ChampionshipFormat, Role } from "@/lib/generated/prisma/enums";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  sport: z.nativeEnum(Sport),
  format: z.nativeEnum(ChampionshipFormat),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  matchDurationMin: z.number().int().min(1).default(90),
  titulares: z.number().int().min(1).default(11),
  suplentes: z.number().int().min(0).default(7),
  maxInscripciones: z.number().int().min(1).default(22),
  maxEquipos: z.number().int().min(0).default(0),
  minSuplentes: z.number().int().min(0).default(5),
  // IDs de usuarios a asignar como organizador y técnicos
  organizadorId: z.string().optional(),
  tecnicoIds: z.array(z.string()).optional(),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// GET /api/championships?search=...&mine=true
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const mine = searchParams.get("mine") === "true";

    // Si mine=true y es organizador: filtrar solo sus campeonatos
    const userId = session?.user?.id;
    const role = session?.user?.role;
    const filterByOrg = mine && userId && role === "organizador";

    const where = {
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(filterByOrg ? {
        userRoles: { some: { userId, role: Role.organizador } },
      } : {}),
    };

    const championships = await prisma.championship.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        userRoles: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(championships);
  } catch (error) {
    console.error("[GET /api/championships]", error);
    return NextResponse.json({ error: "Error al obtener campeonatos" }, { status: 500 });
  }
}

// POST /api/championships
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "administrador") {
      return NextResponse.json({ error: "Solo el administrador puede crear campeonatos" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    // Generar slug único
    let slug = slugify(data.name);
    const existing = await prisma.championship.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const championship = await prisma.championship.create({
      data: {
        name: data.name,
        slug,
        sport: data.sport,
        format: data.format,
        description: data.description,
        location: data.location,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        matchDurationMin: data.matchDurationMin,
        titulares: data.titulares,
        suplentes: data.suplentes,
        maxInscripciones: data.maxInscripciones,
        maxEquipos: data.maxEquipos,
        minSuplentes: data.minSuplentes,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { teams: true } },
      },
    });

    // Asignar organizador al campeonato (actualizar su UserRole)
    if (data.organizadorId) {
      await prisma.userRole.updateMany({
        where: { userId: data.organizadorId, role: Role.organizador },
        data: { championshipId: championship.id },
      });
    }

    // Asignar técnicos al campeonato
    if (data.tecnicoIds?.length) {
      await prisma.userRole.updateMany({
        where: { userId: { in: data.tecnicoIds }, role: Role.tecnico },
        data: { championshipId: championship.id },
      });
    }

    // Generar cuentas de delegado (cupos) para el campeonato
    if (data.maxEquipos > 0) {
      for (let i = 1; i <= data.maxEquipos; i++) {
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const email = `d${i}@${slug}`;

        const delegadoUser = await prisma.user.create({
          data: {
            email,
            name: `Delegado ${i} — ${data.name}`,
            password: hashedPassword,
            mustChangePassword: true,
            tempPassword,
            isActive: true,
          },
        });

        await prisma.userRole.create({
          data: {
            userId: delegadoUser.id,
            role: Role.delegado,
            championshipId: championship.id,
          },
        });
      }
    }

    return NextResponse.json(championship, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[POST /api/championships]", error);
    return NextResponse.json({ error: "Error al crear campeonato" }, { status: 500 });
  }
}
