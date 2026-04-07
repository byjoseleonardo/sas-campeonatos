import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isProduction = process.env.NODE_ENV === "production";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ...(isProduction && { ssl: { rejectUnauthorized: false } }),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
