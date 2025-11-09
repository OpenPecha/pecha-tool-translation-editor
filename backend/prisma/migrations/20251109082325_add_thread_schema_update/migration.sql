/*
  Warnings:

  - You are about to drop the column `comment_on` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `initial_end_offset` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `initial_start_offset` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `is_suggestion` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `parentCommentId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `suggested_text` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `instance_id` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `text_id` on the `DocMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `initial_end_offset` on the `Footnote` table. All the data in the column will be lost.
  - You are about to drop the column `initial_start_offset` on the `Footnote` table. All the data in the column will be lost.
  - You are about to drop the column `note_on` on the `Footnote` table. All the data in the column will be lost.
  - Added the required column `initialEndOffset` to the `Footnote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialStartOffset` to the `Footnote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentCommentId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "comment_on",
DROP COLUMN "initial_end_offset",
DROP COLUMN "initial_start_offset",
DROP COLUMN "is_suggestion",
DROP COLUMN "parentCommentId",
DROP COLUMN "suggested_text",
ADD COLUMN     "isSuggestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedText" TEXT;

-- AlterTable
ALTER TABLE "DocMetadata" DROP COLUMN "instance_id",
DROP COLUMN "text_id",
ADD COLUMN     "instanceId" TEXT,
ADD COLUMN     "textId" TEXT;

-- AlterTable
ALTER TABLE "Footnote" DROP COLUMN "initial_end_offset",
DROP COLUMN "initial_start_offset",
DROP COLUMN "note_on",
ADD COLUMN     "initialEndOffset" INTEGER NOT NULL,
ADD COLUMN     "initialStartOffset" INTEGER NOT NULL,
ADD COLUMN     "noteOn" TEXT;

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "commentOnText" TEXT,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "initialStartOffset" INTEGER NOT NULL,
    "initialEndOffset" INTEGER NOT NULL,
    "selectedText" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
