/*
  Warnings:

  - Added the required column `projectId` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "rootProjectId" TEXT,
ADD COLUMN     "translationsProjectId" TEXT;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_identifier_key" ON "Project"("identifier");

-- CreateIndex
CREATE INDEX "Doc_ownerId_idx" ON "Doc"("ownerId");

-- CreateIndex
CREATE INDEX "Doc_rootId_idx" ON "Doc"("rootId");

-- CreateIndex
CREATE INDEX "Doc_rootProjectId_idx" ON "Doc"("rootProjectId");

-- CreateIndex
CREATE INDEX "Doc_translationsProjectId_idx" ON "Doc"("translationsProjectId");

-- CreateIndex
CREATE INDEX "Permission_docId_idx" ON "Permission"("docId");

-- CreateIndex
CREATE INDEX "Permission_userId_idx" ON "Permission"("userId");

-- CreateIndex
CREATE INDEX "Permission_projectId_idx" ON "Permission"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_rootProjectId_fkey" FOREIGN KEY ("rootProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_translationsProjectId_fkey" FOREIGN KEY ("translationsProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
