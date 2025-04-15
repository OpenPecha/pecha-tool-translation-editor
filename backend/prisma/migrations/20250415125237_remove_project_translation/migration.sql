/*
  Warnings:

  - You are about to drop the column `translationsProjectId` on the `Doc` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_translationsProjectId_fkey";

-- DropIndex
DROP INDEX "Doc_translationsProjectId_idx";

-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "translationsProjectId";
