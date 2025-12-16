-- CreateTable
CREATE TABLE "List" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "items" INTEGER[],

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ListToTier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ListToTier_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ItemToRanking" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ItemToRanking_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ItemToList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ItemToList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ListToTier_B_index" ON "_ListToTier"("B");

-- CreateIndex
CREATE INDEX "_ItemToRanking_B_index" ON "_ItemToRanking"("B");

-- CreateIndex
CREATE INDEX "_ItemToList_B_index" ON "_ItemToList"("B");

-- AddForeignKey
ALTER TABLE "_ListToTier" ADD CONSTRAINT "_ListToTier_A_fkey" FOREIGN KEY ("A") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListToTier" ADD CONSTRAINT "_ListToTier_B_fkey" FOREIGN KEY ("B") REFERENCES "Tier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToRanking" ADD CONSTRAINT "_ItemToRanking_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToRanking" ADD CONSTRAINT "_ItemToRanking_B_fkey" FOREIGN KEY ("B") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToList" ADD CONSTRAINT "_ItemToList_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToList" ADD CONSTRAINT "_ItemToList_B_fkey" FOREIGN KEY ("B") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
