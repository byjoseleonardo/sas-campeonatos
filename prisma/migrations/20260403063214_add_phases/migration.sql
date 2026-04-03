-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('todos_contra_todos', 'grupos', 'eliminacion', 'final');

-- CreateEnum
CREATE TYPE "EliminacionRound" AS ENUM ('dieciseisavos', 'octavos', 'cuartos', 'semifinal');

-- AlterEnum
ALTER TYPE "ChampionshipFormat" ADD VALUE 'personalizado';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "phaseId" TEXT;

-- CreateTable
CREATE TABLE "phases" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PhaseType" NOT NULL,
    "order" INTEGER NOT NULL,
    "legsPerMatch" INTEGER NOT NULL DEFAULT 1,
    "numGroups" INTEGER,
    "teamsPerGroup" INTEGER,
    "teamsAdvance" INTEGER,
    "startingRound" "EliminacionRound",
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phases_championshipId_order_key" ON "phases"("championshipId", "order");

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
