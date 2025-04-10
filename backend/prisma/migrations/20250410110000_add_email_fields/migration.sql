-- Add ownerEmail field to Doc table
ALTER TABLE "Doc" ADD COLUMN "ownerEmail" TEXT;

-- Add userEmail field to Permission table
ALTER TABLE "Permission" ADD COLUMN "userEmail" TEXT;

-- Update existing records to populate the new email fields
UPDATE "Doc" d
SET "ownerEmail" = u.email
FROM "User" u
WHERE d."ownerId" = u.id;

UPDATE "Permission" p
SET "userEmail" = u.email
FROM "User" u
WHERE p."userId" = u.id;

-- Make userEmail NOT NULL after populating data
ALTER TABLE "Permission" ALTER COLUMN "userEmail" SET NOT NULL;

-- Change unique constraint from docId+userId to docId+userEmail
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_docId_userId_key";
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_docId_userEmail_key" UNIQUE ("docId", "userEmail");
