-- CreateTable
CREATE TABLE "WebuddhistThread" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebuddhistThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webuddhist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "response" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "question" TEXT NOT NULL,

    CONSTRAINT "Webuddhist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WebuddhistResponse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WebuddhistResponse_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_WebuddhistResponse_B_index" ON "_WebuddhistResponse"("B");

-- AddForeignKey
ALTER TABLE "_WebuddhistResponse" ADD CONSTRAINT "_WebuddhistResponse_A_fkey" FOREIGN KEY ("A") REFERENCES "Webuddhist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WebuddhistResponse" ADD CONSTRAINT "_WebuddhistResponse_B_fkey" FOREIGN KEY ("B") REFERENCES "WebuddhistThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
