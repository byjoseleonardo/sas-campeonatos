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

  // Superadministrador
  const hashedSuper = await bcrypt.hash("super123", 10);
  const superadmin = await prisma.user.create({
    data: {
      firstName: "Super",
      paternalLastName: "Administrador",
      email: "super@champzone.com",
      password: hashedSuper,
      isActive: true,
      mustChangePassword: false,
      userRoles: {
        create: { role: "superadministrador" },
      },
    },
  });

  console.log("\n✅ Seed completado.");
  console.log("──────────────────────────────────────────");
  console.log(`  ${superadmin.email}  →  super123  (superadmin)`);
  console.log("──────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
