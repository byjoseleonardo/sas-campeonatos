import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Limpiando base de datos...");

  // Borrar en orden para respetar foreign keys
  await prisma.suspension.deleteMany();
  await prisma.matchEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.groupTeam.deleteMany();
  await prisma.group.deleteMany();
  await prisma.jornada.deleteMany();
  await prisma.rosterEntry.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.championship.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Base de datos limpia.");
  console.log("🌱 Creando datos iniciales...");

  // Administrador
  const hashedAdmin = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@champzone.com",
      password: hashedAdmin,
      isActive: true,
      mustChangePassword: false,
      userRoles: {
        create: { role: "administrador" },
      },
    },
  });
  console.log(`✅ Admin: ${admin.email} / admin123`);

  // Organizador de prueba
  const hashedOrg = await bcrypt.hash("org123", 10);
  const org = await prisma.user.create({
    data: {
      name: "Organizador Demo",
      email: "org@champzone.com",
      password: hashedOrg,
      isActive: true,
      mustChangePassword: false,
      userRoles: {
        create: { role: "organizador" },
      },
    },
  });
  console.log(`✅ Organizador: ${org.email} / org123`);

  console.log("\n✅ Seed completado.");
  console.log("─────────────────────────────────");
  console.log("  admin@champzone.com  →  admin123");
  console.log("  org@champzone.com    →  org123");
  console.log("─────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
