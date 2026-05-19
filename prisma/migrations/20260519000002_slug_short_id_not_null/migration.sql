-- Make short_id and slug NOT NULL now that all rows are backfilled
ALTER TABLE "List" ALTER COLUMN "short_id" SET NOT NULL;
ALTER TABLE "List" ALTER COLUMN "slug"     SET NOT NULL;
