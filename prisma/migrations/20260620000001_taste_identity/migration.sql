-- Persistent taste identity: per-user precomputed twin/nemesis + privacy toggle.
ALTER TABLE "User" ADD COLUMN "taste_matches" JSONB;
ALTER TABLE "User" ADD COLUMN "profile_private" BOOLEAN NOT NULL DEFAULT false;
