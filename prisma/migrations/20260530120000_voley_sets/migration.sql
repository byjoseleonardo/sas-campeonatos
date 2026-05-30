-- AlterTable: configuración de vóley por sets en cada partido (todo nullable)
ALTER TABLE "matches" ADD COLUMN     "setsToWin" INTEGER,
ADD COLUMN     "pointsPerSet" INTEGER,
ADD COLUMN     "decidingSetPoints" INTEGER,
ADD COLUMN     "winByMargin" INTEGER,
ADD COLUMN     "capPoints" INTEGER,
ADD COLUMN     "currentSet" INTEGER;

-- CreateTable: detalle punto a punto de cada set
CREATE TABLE "match_sets" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "homePoints" INTEGER NOT NULL DEFAULT 0,
    "awayPoints" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'en_curso',
    "winnerTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_sets_matchId_setNumber_key" ON "match_sets"("matchId", "setNumber");

-- AddForeignKey
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
