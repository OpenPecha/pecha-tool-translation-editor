/*
  Warnings:

  - A unique constraint covering the columns `[currentVersionId]` on the table `Doc` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "currentVersionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Doc_currentVersionId_key" ON "Doc"("currentVersionId");

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
