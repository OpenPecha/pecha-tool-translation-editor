/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `Doc` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'document';

-- CreateIndex
CREATE UNIQUE INDEX "Doc_identifier_key" ON "Doc"("identifier");
