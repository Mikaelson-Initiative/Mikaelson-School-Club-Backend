-- CreateEnum
CREATE TYPE "SponsorshipType" AS ENUM ('STUDENT', 'CHAPTER');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "type" "SponsorshipType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "chapterId" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsorship_reference_key" ON "Sponsorship"("reference");

-- CreateIndex
CREATE INDEX "Sponsorship_status_idx" ON "Sponsorship"("status");

-- CreateIndex
CREATE INDEX "Sponsorship_reference_idx" ON "Sponsorship"("reference");

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "SchoolChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

