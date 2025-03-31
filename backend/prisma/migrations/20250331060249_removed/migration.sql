/*
  Warnings:

  - You are about to drop the `Suggestion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_docId_fkey";

-- DropForeignKey
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "is_suggestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggested_text" TEXT;

-- DropTable
DROP TABLE "Suggestion";
