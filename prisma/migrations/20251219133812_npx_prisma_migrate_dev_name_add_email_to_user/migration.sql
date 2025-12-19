/*
  Warnings:

  - You are about to drop the column `createdBy` on the `Item` table. All the data in the column will be lost.
  - The `createdAt` column on the `Item` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedAt` column on the `Item` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdBy` on the `List` table. All the data in the column will be lost.
  - The `createdAt` column on the `List` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedAt` column on the `List` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `user` on the `Ranking` table. All the data in the column will be lost.
  - The `createdAt` column on the `Ranking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedAt` column on the `Ranking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `_ItemToRanking` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `createdById` on table `Item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdById` on table `List` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `itemId` to the `Ranking` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Ranking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "_ItemToRanking" DROP CONSTRAINT "_ItemToRanking_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToRanking" DROP CONSTRAINT "_ItemToRanking_B_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "createdBy",
DROP COLUMN "createdAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "updatedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "List" DROP COLUMN "createdBy",
DROP COLUMN "createdAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "updatedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ranking" DROP COLUMN "user",
ADD COLUMN     "itemId" INTEGER NOT NULL,
DROP COLUMN "createdAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "updatedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "userId" SET NOT NULL;

-- DropTable
DROP TABLE "_ItemToRanking";

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
