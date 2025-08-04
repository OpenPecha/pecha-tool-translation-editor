-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_currentVersionId_fkey";

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
