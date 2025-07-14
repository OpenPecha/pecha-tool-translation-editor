/*
  Warnings:

  - A unique constraint covering the columns `[shareLink]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicAccess" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "shareLink" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareLink_key" ON "Project"("shareLink");
