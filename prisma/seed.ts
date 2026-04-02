import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Administrador por defecto
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@champzone.com" },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 12);

    const admin = await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin@champzone.com",
        password: hashedPassword,
        isActive: true,
        userRoles: {
          create: {
            role: "administrador",
          },
        },
      },
    });

    console.log(`✅ Administrador creado: ${admin.email}`);
  } else {
    console.log("ℹ️  Administrador ya existe, omitiendo.");
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
