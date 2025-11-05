/*
  Warnings:

  - You are about to drop the column `metadata` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "metadata";

-- CreateTable
CREATE TABLE "DocMetadata" (
    "id" TEXT NOT NULL,
    "alt_incipit_titles" JSONB[],
    "bdrc" TEXT,
    "colophon" TEXT,
    "copyright" TEXT,
    "incipit_title" JSONB,
    "type" TEXT,
    "wiki" TEXT,
    "docId" TEXT NOT NULL,

    CONSTRAINT "DocMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocMetadata_docId_key" ON "DocMetadata"("docId");

-- AddForeignKey
ALTER TABLE "DocMetadata" ADD CONSTRAINT "DocMetadata_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
