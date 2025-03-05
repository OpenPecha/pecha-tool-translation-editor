/*
  Warnings:

  - You are about to drop the column `documentId` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[docId,userId]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `docId` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_userId_fkey";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "documentId",
ADD COLUMN     "docId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "Doc" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "docs_prosemirror_delta" JSONB,
    "docs_y_doc_state" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "Doc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Doc_identifier_key" ON "Doc"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_docId_userId_key" ON "Permission"("docId", "userId");

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
