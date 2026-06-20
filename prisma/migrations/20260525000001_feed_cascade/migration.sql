-- Add milestone event type
ALTER TYPE "ActivityEventType" ADD VALUE IF NOT EXISTS 'milestone';

-- Add last_feed_visit_at to User for "since you were last here" framing
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_feed_visit_at" TIMESTAMP(3);
