/*
  Warnings:

  - You are about to drop the column `annoatationId` on the `TempSearchSegments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TempSearchSegments_annoatationId_idx";

-- AlterTable
ALTER TABLE "TempSearchSegments" DROP COLUMN "annoatationId",
ADD COLUMN     "annotationId" TEXT;

-- CreateIndex
CREATE INDEX "TempSearchSegments_annotationId_idx" ON "TempSearchSegments"("annotationId");
