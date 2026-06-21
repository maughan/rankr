CREATE TYPE "NotificationType" AS ENUM ('ranked_your_list','new_follower','new_taste_twin','list_milestone','hot_take');

CREATE TABLE "Notification" (
  "id" SERIAL PRIMARY KEY,
  "recipientId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "actorId" INTEGER,
  "listId" INTEGER,
  "itemId" INTEGER,
  "count" INTEGER NOT NULL DEFAULT 1,
  "meta" JSONB,
  "read_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "Notification_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE
);
CREATE INDEX "Notification_recipientId_read_at_idx" ON "Notification"("recipientId","read_at");
CREATE INDEX "Notification_recipientId_updatedAt_idx" ON "Notification"("recipientId","updatedAt" DESC);
