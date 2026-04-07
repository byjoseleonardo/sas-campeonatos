import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@champzone.com" },
    update: {},
    create: {
      firstName: "Administrador",
      paternalLastName: "Demo",
      email: "admin@champzone.com",
      password: hash,
      isActive: true,
      mustChangePassword: false,
      userRoles: { create: { role: "administrador" } },
    },
  });
  console.log("Admin creado:", admin.email, "/ admin123");
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
