/*
  Warnings:

  - You are about to drop the column `docs_prosemirror_delta` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `docs_y_doc_state` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Version` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "docs_prosemirror_delta",
DROP COLUMN "docs_y_doc_state",
ADD COLUMN     "autoSaveInterval" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "lastContentHash" TEXT,
ADD COLUMN     "latestVersionId" TEXT,
ADD COLUMN     "versioningStrategy" TEXT NOT NULL DEFAULT 'auto';

-- AlterTable
ALTER TABLE "Version" DROP COLUMN "timestamp",
ADD COLUMN     "annotationDiff" JSONB,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "changeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "changeSummary" TEXT,
ADD COLUMN     "changeType" TEXT NOT NULL DEFAULT 'content',
ADD COLUMN     "characterCount" INTEGER,
ADD COLUMN     "contentDiff" JSONB,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isAutosave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMerge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSnapshot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "mergedFromIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parentVersionId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "snapshotReason" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wordCount" INTEGER,
ALTER COLUMN "label" SET DEFAULT 'Autosave';

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "versionId" TEXT,
    "type" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "originalVersionId" TEXT,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annotationHash" TEXT,
    "changeHistory" JSONB,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionWorkflow" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "workflowType" TEXT NOT NULL DEFAULT 'editing',
    "startVersionId" TEXT,
    "endVersionId" TEXT,
    "targetVersionId" TEXT,
    "totalChanges" INTEGER NOT NULL DEFAULT 0,
    "contentChanges" INTEGER NOT NULL DEFAULT 0,
    "annotationChanges" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "autoSaveCount" INTEGER NOT NULL DEFAULT 0,
    "checkpointCount" INTEGER NOT NULL DEFAULT 0,
    "lastAutoSave" TIMESTAMP(3),
    "lastCheckpoint" TIMESTAMP(3),
    "collaborators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "mergeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VersionWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_docId_idx" ON "Annotation"("docId");

-- CreateIndex
CREATE INDEX "Annotation_versionId_idx" ON "Annotation"("versionId");

-- CreateIndex
CREATE INDEX "Annotation_docId_isActive_idx" ON "Annotation"("docId", "isActive");

-- CreateIndex
CREATE INDEX "Annotation_originalVersionId_idx" ON "Annotation"("originalVersionId");

-- CreateIndex
CREATE INDEX "VersionWorkflow_docId_idx" ON "VersionWorkflow"("docId");

-- CreateIndex
CREATE INDEX "VersionWorkflow_userId_idx" ON "VersionWorkflow"("userId");

-- CreateIndex
CREATE INDEX "VersionWorkflow_sessionId_idx" ON "VersionWorkflow"("sessionId");

-- CreateIndex
CREATE INDEX "VersionWorkflow_docId_status_idx" ON "VersionWorkflow"("docId", "status");

-- CreateIndex
CREATE INDEX "VersionWorkflow_lastActivityAt_idx" ON "VersionWorkflow"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Doc_currentVersionId_idx" ON "Doc"("currentVersionId");

-- CreateIndex
CREATE INDEX "Version_docId_idx" ON "Version"("docId");

-- CreateIndex
CREATE INDEX "Version_userId_idx" ON "Version"("userId");

-- CreateIndex
CREATE INDEX "Version_parentVersionId_idx" ON "Version"("parentVersionId");

-- CreateIndex
CREATE INDEX "Version_docId_sequenceNumber_idx" ON "Version"("docId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "Version_docId_isSnapshot_idx" ON "Version"("docId", "isSnapshot");

-- CreateIndex
CREATE INDEX "Version_docId_createdAt_idx" ON "Version"("docId", "createdAt");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionWorkflow" ADD CONSTRAINT "VersionWorkflow_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionWorkflow" ADD CONSTRAINT "VersionWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
