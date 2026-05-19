-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('public', 'hidden', 'draft');

-- AlterTable List: add visibility column, backfill from hidden, drop hidden
ALTER TABLE "List" ADD COLUMN "visibility" "ListVisibility" NOT NULL DEFAULT 'hidden';
UPDATE "List" SET "visibility" = 'public' WHERE "hidden" = false;
UPDATE "List" SET "visibility" = 'hidden' WHERE "hidden" = true;
ALTER TABLE "List" DROP COLUMN "hidden";
-- New lists default to draft (change the column default)
ALTER TABLE "List" ALTER COLUMN "visibility" SET DEFAULT 'draft';

-- AlterTable User: add profile fields
ALTER TABLE "User" ADD COLUMN "display_name" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "username_changed_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable UserUsernameHistory
CREATE TABLE "UserUsernameHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserUsernameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserUsernameHistory_username_idx" ON "UserUsernameHistory"("username");

-- AddForeignKey
ALTER TABLE "UserUsernameHistory" ADD CONSTRAINT "UserUsernameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
