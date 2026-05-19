-- AlterTable: add human-readable URL columns (nullable for zero-downtime backfill)
ALTER TABLE "List" ADD COLUMN "short_id" TEXT;
ALTER TABLE "List" ADD COLUMN "slug"     TEXT;

-- CreateIndex: short_id must be globally unique; slug is non-unique by design
CREATE UNIQUE INDEX "List_short_id_key" ON "List"("short_id");
CREATE        INDEX "List_slug_idx"     ON "List"("slug");
