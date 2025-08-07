/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Version` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_rootId_fkey";

-- AlterTable
ALTER TABLE "Version" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
