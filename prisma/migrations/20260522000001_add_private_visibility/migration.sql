-- Add 'private' value to ListVisibility enum
ALTER TYPE "ListVisibility" ADD VALUE IF NOT EXISTS 'private';

-- Add publish-tracking fields to List
ALTER TABLE "List" ADD COLUMN "has_been_published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "List" ADD COLUMN "published_at" TIMESTAMP(3);

-- Backfill: any list that is currently public has been published
UPDATE "List" SET "has_been_published" = true, "published_at" = "createdAt" WHERE "visibility" = 'public';

-- CreateTable ListInvite
CREATE TABLE "ListInvite" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "invite_token" TEXT NOT NULL,
    "invitedUserId" INTEGER,
    "invitedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "ListInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListInvite_invite_token_key" ON "ListInvite"("invite_token");
CREATE INDEX "ListInvite_listId_idx" ON "ListInvite"("listId");
CREATE INDEX "ListInvite_invitedUserId_idx" ON "ListInvite"("invitedUserId");

-- AddForeignKey
ALTER TABLE "ListInvite" ADD CONSTRAINT "ListInvite_listId_fkey"
    FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListInvite" ADD CONSTRAINT "ListInvite_invitedUserId_fkey"
    FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ListInvite" ADD CONSTRAINT "ListInvite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
