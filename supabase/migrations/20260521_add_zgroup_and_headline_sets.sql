-- Add zGroup to Creative
ALTER TABLE "Creative" ADD COLUMN IF NOT EXISTS "zGroup" TEXT;
CREATE INDEX IF NOT EXISTS "Creative_userId_zGroup_idx" ON "Creative"("userId", "zGroup");

-- HeadlineSet table
CREATE TABLE IF NOT EXISTS "HeadlineSet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "externalId" TEXT,
  "headlinesJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HeadlineSet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HeadlineSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "HeadlineSet_userId_idx" ON "HeadlineSet"("userId");
