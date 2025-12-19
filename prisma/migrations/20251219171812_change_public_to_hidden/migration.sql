/*
  Warnings:

  - You are about to drop the column `public` on the `List` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "List" DROP COLUMN "public",
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT true;
