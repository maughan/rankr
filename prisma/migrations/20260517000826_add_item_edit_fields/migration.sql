-- DropForeignKey
ALTER TABLE "Ranking" DROP CONSTRAINT "Ranking_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "image_uploaded_at" TIMESTAMP(3),
ADD COLUMN     "name_updated_at" TIMESTAMP(3),
ADD COLUMN     "short_label_user_set" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
