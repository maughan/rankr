-- Make userId nullable on Ranking (support anonymous submissions)
ALTER TABLE "Ranking" ALTER COLUMN "userId" DROP NOT NULL;

-- Add anonymous-ranking columns to Ranking
ALTER TABLE "Ranking"
  ADD COLUMN "listId"                  INT,
  ADD COLUMN "is_anonymous"            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anonymous_session_token" TEXT,
  ADD COLUMN "submitter_ip_hash"       TEXT;

-- FK: Ranking.listId → List.id, cascade on list delete
ALTER TABLE "Ranking"
  ADD CONSTRAINT "Ranking_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE;

-- Fast lookup index for anonymous session per list
CREATE INDEX "Ranking_listId_anonymous_session_token_idx"
  ON "Ranking"("listId", "anonymous_session_token");

-- Identity constraint: exactly one of userId or anonymous_session_token
ALTER TABLE "Ranking"
  ADD CONSTRAINT "Ranking_identity_check"
  CHECK (
    ("userId" IS NOT NULL AND "anonymous_session_token" IS NULL) OR
    ("userId" IS NULL  AND "anonymous_session_token" IS NOT NULL)
  );

-- Add shareable-link columns to List
ALTER TABLE "List"
  ADD COLUMN "is_shareable"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "share_token"                TEXT,
  ADD COLUMN "share_token_created_at"     TIMESTAMPTZ,
  ADD COLUMN "anonymous_rankings_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Unique index on share_token
CREATE UNIQUE INDEX "List_share_token_key" ON "List"("share_token");
