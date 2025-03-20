-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);
