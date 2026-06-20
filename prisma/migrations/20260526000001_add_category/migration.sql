-- Add category column; DEFAULT 'other' backfills all existing rows atomically
ALTER TABLE "List" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'other';

-- Drop cosmetic icon/color columns (superseded by category)
ALTER TABLE "List" DROP COLUMN IF EXISTS "category_icon";
ALTER TABLE "List" DROP COLUMN IF EXISTS "category_color";

-- Drop unused tags array
ALTER TABLE "List" DROP COLUMN IF EXISTS "tags";
