/*
  Warnings:

  - You are about to drop the `_WebuddhistResponse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_WebuddhistResponse" DROP CONSTRAINT "_WebuddhistResponse_A_fkey";

-- DropForeignKey
ALTER TABLE "_WebuddhistResponse" DROP CONSTRAINT "_WebuddhistResponse_B_fkey";

-- AlterTable
ALTER TABLE "Webuddhist" ADD COLUMN     "webuddhistThreadId" TEXT;

-- DropTable
DROP TABLE "_WebuddhistResponse";

-- AddForeignKey
ALTER TABLE "Webuddhist" ADD CONSTRAINT "Webuddhist_webuddhistThreadId_fkey" FOREIGN KEY ("webuddhistThreadId") REFERENCES "WebuddhistThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
