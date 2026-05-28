-- Add geo to Creative
ALTER TABLE "Creative" ADD COLUMN IF NOT EXISTS "geo" TEXT;
CREATE INDEX IF NOT EXISTS "Creative_userId_geo_idx" ON "Creative"("userId", "geo");

-- Add geo to HeadlineSet
ALTER TABLE "HeadlineSet" ADD COLUMN IF NOT EXISTS "geo" TEXT;
CREATE INDEX IF NOT EXISTS "HeadlineSet_userId_geo_idx" ON "HeadlineSet"("userId", "geo");
