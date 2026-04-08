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
  maxInscripciones: z.number().int().min(1),
  minJugadores: z.number().int().min(1),
  maxEquipos: z.number().int().min(0).default(0),
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

// GET /api/championships?search=...
// - Admin: ve campeonatos donde adminId = session.user.id
// - Organizador: ve sus propios campeonatos (por userRole)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const userId = session.user.id;
    const role = session.user.role as Role;

    let scopeFilter: Record<string, unknown> = {};
    if (role === Role.administrador) {
      scopeFilter = { adminId: userId };
    } else if (role === Role.organizador) {
      scopeFilter = { userRoles: { some: { userId, role: Role.organizador } } };
    }
    // Superadmin ve todo

    const where = {
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...scopeFilter,
    };

    const championships = await prisma.championship.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, paternalLastName: true } },
        userRoles: {
          include: { user: { select: { id: true, firstName: true, paternalLastName: true, email: true } } },
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
    if (session.user.role !== "organizador") {
      return NextResponse.json({ error: "Solo el organizador puede crear campeonatos" }, { status: 403 });
    }

    // Obtener el adminId del organizador para heredarlo al campeonato
    const orgUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { adminId: true },
    });

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
        maxInscripciones: data.maxInscripciones,
        minJugadores: data.minJugadores,
        maxEquipos: data.maxEquipos,
        createdById: session.user.id,
        adminId: orgUser?.adminId ?? null,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, paternalLastName: true } },
        _count: { select: { teams: true } },
      },
    });

    // Auto-asignar el organizador (quien crea) al campeonato
    await prisma.userRole.upsert({
      where: { userId_role_championshipId: { userId: session.user.id, role: Role.organizador, championshipId: championship.id } },
      update: {},
      create: { userId: session.user.id, role: Role.organizador, championshipId: championship.id },
    });

    // Asignar técnicos de mesa al campeonato
    if (data.tecnicoIds?.length) {
      await prisma.userRole.updateMany({
        where: { userId: { in: data.tecnicoIds }, role: Role.tecnico_mesa },
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
            firstName: `Delegado ${i}`,
            paternalLastName: data.name,
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
