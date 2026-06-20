-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "color" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "short_label" TEXT,
ALTER COLUMN "img" DROP NOT NULL;
