-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "translationJobId" TEXT,
ADD COLUMN     "translationProgress" INTEGER DEFAULT 0,
ADD COLUMN     "translationStatus" TEXT;
