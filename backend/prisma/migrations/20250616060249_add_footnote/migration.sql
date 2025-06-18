-- CreateTable
CREATE TABLE "Footnote" (
    "id" TEXT NOT NULL,
    "threadId" TEXT,
    "docId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "note_on" TEXT,
    "initial_start_offset" INTEGER NOT NULL,
    "initial_end_offset" INTEGER NOT NULL,

    CONSTRAINT "Footnote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Footnote" ADD CONSTRAINT "Footnote_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Footnote" ADD CONSTRAINT "Footnote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
