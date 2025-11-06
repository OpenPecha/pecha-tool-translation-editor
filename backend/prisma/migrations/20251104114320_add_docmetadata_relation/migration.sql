/*
  Warnings:

  - You are about to drop the column `alt_incipit_titles` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `bdrc` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `colophon` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `copyright` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `incipit_title` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `wiki` on the `DocMetadata` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DocMetadata" DROP COLUMN "alt_incipit_titles",
DROP COLUMN "bdrc",
DROP COLUMN "colophon",
DROP COLUMN "copyright",
DROP COLUMN "incipit_title",
DROP COLUMN "type",
DROP COLUMN "wiki",
ADD COLUMN     "instance_id" TEXT,
ADD COLUMN     "text_id" TEXT;
