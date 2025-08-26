/*
  Warnings:

  - You are about to drop the column `translationJobId` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `translationProgress` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `translationStatus` on the `Doc` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_rootProjectId_fkey";

-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "translationJobId",
DROP COLUMN "translationProgress",
DROP COLUMN "translationStatus";

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_rootProjectId_fkey" FOREIGN KEY ("rootProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
