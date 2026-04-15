/*
  Warnings:

  - The values [tecnico] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lastName` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - Added the required column `paternalLastName` to the `players` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paternalLastName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('superadministrador', 'administrador', 'organizador', 'supervisor', 'tecnico_mesa', 'delegado');
ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "championships" ADD COLUMN     "adminId" TEXT,
ALTER COLUMN "maxInscripciones" DROP DEFAULT;

-- AlterTable
ALTER TABLE "players" DROP COLUMN "lastName",
ADD COLUMN     "maternalLastName" TEXT,
ADD COLUMN     "paternalLastName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "maternalLastName" TEXT,
ADD COLUMN     "paternalLastName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championships" ADD CONSTRAINT "championships_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
