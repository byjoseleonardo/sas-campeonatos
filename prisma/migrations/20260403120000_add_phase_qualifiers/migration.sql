-- CreateTable
CREATE TABLE "phase_qualifiers" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupName" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "phase_qualifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_qualifiers_phaseId_teamId_key" ON "phase_qualifiers"("phaseId", "teamId");

-- AddForeignKey
ALTER TABLE "phase_qualifiers" ADD CONSTRAINT "phase_qualifiers_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_qualifiers" ADD CONSTRAINT "phase_qualifiers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
