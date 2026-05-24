-- CreateEnum
CREATE TYPE "ArchetypeSlug" AS ENUM ('contrarian', 'oracle', 'purist', 'diplomat', 'enthusiast', 'critic', 'wildcard');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "archetype"             "ArchetypeSlug",
  ADD COLUMN "archetype_stats"       JSONB,
  ADD COLUMN "archetype_computed_at" TIMESTAMP(3);
