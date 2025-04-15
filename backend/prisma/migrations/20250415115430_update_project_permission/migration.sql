/*
  Warnings:

  - A unique constraint covering the columns `[docId,userId]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_projectId_fkey";

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_docId_userId_key" ON "Permission"("docId", "userId");

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
