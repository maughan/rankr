-- DropForeignKey
ALTER TABLE "Ranking" DROP CONSTRAINT "Ranking_listId_fkey";

-- DropForeignKey
ALTER TABLE "Ranking" DROP CONSTRAINT "Ranking_userId_fkey";

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "share_token_created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE;
