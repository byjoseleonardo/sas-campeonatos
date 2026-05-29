import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Técnicos de mesa a crear/asegurar
const TECNICOS = [
  { email: "aldo.ramirezc@pucp.pe", firstName: "Aldo", paternalLastName: "Ramírez", maternalLastName: "C." },
  { email: "2020210346@udh.edu.pe", firstName: "Técnico", paternalLastName: "Mesa", maternalLastName: "UDH" },
];

function genPassword(): string {
  // 8 caracteres legibles
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = randomBytes(8);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

async function main() {
  // 1) Tenant (adminId): tomamos el del organizador principal, si no, el primer admin
  const organizador = await prisma.user.findUnique({
    where: { email: "joseleonardot115@gmail.com" },
    select: { id: true, adminId: true },
  });

  let tenantAdminId = organizador?.adminId ?? null;
  if (!tenantAdminId) {
    const admin = await prisma.userRole.findFirst({
      where: { role: "administrador" },
      select: { userId: true },
    });
    tenantAdminId = admin?.userId ?? null;
  }
  console.log(`🏷️  Tenant adminId: ${tenantAdminId ?? "(ninguno)"}`);

  // 2) Campeonatos a asignar (todos)
  const championships = await prisma.championship.findMany({
    select: { id: true, name: true, sport: true },
    orderBy: { createdAt: "asc" },
  });
  if (championships.length === 0) {
    console.warn("⚠️  No hay campeonatos en la base de datos.");
  } else {
    console.log(`📋 ${championships.length} campeonatos encontrados:`);
    championships.forEach((c) => console.log(`   - ${c.name} (${c.sport})`));
  }
  console.log("");

  // 3) Crear/asegurar cada técnico + asignación por campeonato
  for (const t of TECNICOS) {
    const existing = await prisma.user.findUnique({ where: { email: t.email } });

    let userId: string;
    let passwordInfo: string;

    if (existing) {
      userId = existing.id;
      passwordInfo = "(ya existía, contraseña sin cambios)";
      // asegurar tenant
      if (tenantAdminId && existing.adminId !== tenantAdminId) {
        await prisma.user.update({ where: { id: userId }, data: { adminId: tenantAdminId } });
      }
    } else {
      const plain = genPassword();
      const hash = await bcrypt.hash(plain, 12);
      const created = await prisma.user.create({
        data: {
          email: t.email,
          firstName: t.firstName,
          paternalLastName: t.paternalLastName,
          maternalLastName: t.maternalLastName,
          password: hash,
          tempPassword: plain,
          adminId: tenantAdminId,
          isActive: true,
          mustChangePassword: true,
        },
      });
      userId = created.id;
      passwordInfo = `contraseña temporal: ${plain}`;
    }

    // Asignar rol tecnico_mesa a cada campeonato (si no lo tiene)
    let assigned = 0;
    for (const c of championships) {
      const has = await prisma.userRole.findFirst({
        where: { userId, role: "tecnico_mesa", championshipId: c.id },
      });
      if (!has) {
        await prisma.userRole.create({
          data: { userId, role: "tecnico_mesa", championshipId: c.id },
        });
        assigned++;
      }
    }

    console.log(`✅ ${t.email}  →  ${passwordInfo}`);
    console.log(`   id=${userId} · asignado a ${assigned} campeonatos nuevos (de ${championships.length} totales)\n`);
  }

  console.log("──────────────────────────────────────────");
  console.log("Listo. Los técnicos pueden iniciar sesión y verán los partidos de sus campeonatos.");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
