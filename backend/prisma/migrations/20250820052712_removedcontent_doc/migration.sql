/*
  Warnings:

  - You are about to drop the column `docs_prosemirror_delta` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `docs_y_doc_state` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "docs_prosemirror_delta",
DROP COLUMN "docs_y_doc_state";
