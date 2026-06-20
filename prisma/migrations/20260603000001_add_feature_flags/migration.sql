CREATE TABLE "FeatureFlag" (
  "key"         TEXT      NOT NULL,
  "enabled"     BOOLEAN   NOT NULL DEFAULT true,
  "description" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- Seed the onboarding flag as disabled until issues are resolved
INSERT INTO "FeatureFlag" ("key", "enabled", "description")
VALUES ('onboarding_enabled', false, 'Controls whether new users are funnelled through the onboarding flow.');
