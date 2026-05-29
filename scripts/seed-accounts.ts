import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Cuentas a crear ──────────────────────────────────────────────
// Las contraseñas NO se hardcodean: se leen del entorno para no exponerlas en git.
//   SEED_ADMIN_PASSWORD=...  SEED_ORG_PASSWORD=...  npx tsx scripts/seed-accounts.ts
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "sgiciphuanuco@gmail.com",
  firstName: "Administrador",
  paternalLastName: "SGI CIP Huánuco",
  password: process.env.SEED_ADMIN_PASSWORD ?? "",
};
const ORGANIZADOR = {
  email: process.env.SEED_ORG_EMAIL ?? "joseleonardot115@gmail.com",
  firstName: "Jose Leonardo",
  paternalLastName: "Toledo",
  password: process.env.SEED_ORG_PASSWORD ?? "",
};

async function upsertUser(
  data: { email: string; firstName: string; paternalLastName: string; password: string },
  role: "administrador" | "organizador",
  adminId: string | null
) {
  const hash = await bcrypt.hash(data.password, 12);
  // ¿ya existe?
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const user = await prisma.user.update({
      where: { email: data.email },
      data: {
        firstName: data.firstName,
        paternalLastName: data.paternalLastName,
        password: hash,
        adminId,
        isActive: true,
        mustChangePassword: false,
      },
    });
    // asegurar el rol
    await prisma.userRole.upsert({
      where: { userId_role_championshipId: { userId: user.id, role, championshipId: null as unknown as string } },
      update: {},
      create: { userId: user.id, role },
    }).catch(async () => {
      const has = await prisma.userRole.findFirst({ where: { userId: user.id, role } });
      if (!has) await prisma.userRole.create({ data: { userId: user.id, role } });
    });
    return user;
  }
  return prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      paternalLastName: data.paternalLastName,
      password: hash,
      adminId,
      isActive: true,
      mustChangePassword: false,
      userRoles: { create: { role } },
    },
  });
}

async function main() {
  if (!ADMIN.password || !ORGANIZADOR.password) {
    throw new Error(
      "Faltan contraseñas. Define SEED_ADMIN_PASSWORD y SEED_ORG_PASSWORD en el entorno antes de correr este script."
    );
  }
  console.log("🌱 Creando admin y organizador...\n");

  const admin = await upsertUser(ADMIN, "administrador", null);
  console.log(`✅ Admin:        ${admin.email}  →  ${ADMIN.password}  (administrador)  id=${admin.id}`);

  const organizador = await upsertUser(ORGANIZADOR, "organizador", admin.id);
  console.log(`✅ Organizador:  ${organizador.email}  →  ${ORGANIZADOR.password}  (organizador, adminId=${admin.id})`);

  console.log("\n──────────────────────────────────────────");
  console.log("Jerarquía:  superadmin → admin → organizador");
  console.log("Los 4 campeonatos se crearán bajo el organizador", organizador.email);
  console.log("──────────────────────────────────────────");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
