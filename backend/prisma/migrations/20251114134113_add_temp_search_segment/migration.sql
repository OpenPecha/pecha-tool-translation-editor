-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "references" SET DEFAULT '[]';

-- CreateTable
CREATE TABLE "TempSearchSegments" (
    "id" TEXT NOT NULL,
    "textId" TEXT,
    "instanceId" TEXT,
    "annoatationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempSearchSegments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempSearchSegments_textId_idx" ON "TempSearchSegments"("textId");

-- CreateIndex
CREATE INDEX "TempSearchSegments_instanceId_idx" ON "TempSearchSegments"("instanceId");

-- CreateIndex
CREATE INDEX "TempSearchSegments_annoatationId_idx" ON "TempSearchSegments"("annoatationId");
