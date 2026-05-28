CREATE TABLE "CampaignTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "buyingType" TEXT NOT NULL DEFAULT 'AUCTION',
  "campaignStatus" TEXT NOT NULL DEFAULT 'PAUSED',
  "dailyBudget" DECIMAL(12,2),
  "bidStrategy" TEXT NOT NULL DEFAULT 'LOWEST_COST_WITHOUT_CAP',
  "optimizationGoal" TEXT NOT NULL DEFAULT 'LINK_CLICKS',
  "billingEvent" TEXT NOT NULL DEFAULT 'IMPRESSIONS',
  "targetingJson" JSONB,
  "adSetNameTpl" TEXT NOT NULL DEFAULT '{account} - AdSet',
  "adNameTpl" TEXT NOT NULL DEFAULT '{account} - {creative}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "CampaignTemplate_userId_idx" ON "CampaignTemplate"("userId");

CREATE TABLE "Creative" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'IMAGE',
  "mediaUrl" TEXT,
  "headline" TEXT,
  "primaryText" TEXT,
  "description" TEXT,
  "callToAction" TEXT NOT NULL DEFAULT 'LEARN_MORE',
  "destinationUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Creative_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Creative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Creative_userId_idx" ON "Creative"("userId");

CREATE TABLE "LaunchJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "campaignTemplateId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalAccounts" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "configJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LaunchJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaunchJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "LaunchJob_templateId_fkey" FOREIGN KEY ("campaignTemplateId") REFERENCES "CampaignTemplate"("id") ON DELETE SET NULL
);
CREATE INDEX "LaunchJob_userId_createdAt_idx" ON "LaunchJob"("userId", "createdAt");

CREATE TABLE "LaunchJobItem" (
  "id" TEXT NOT NULL,
  "launchJobId" TEXT NOT NULL,
  "adAccountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "resultJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaunchJobItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaunchJobItem_jobId_fkey" FOREIGN KEY ("launchJobId") REFERENCES "LaunchJob"("id") ON DELETE CASCADE,
  CONSTRAINT "LaunchJobItem_accountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "MetaAdAccount"("id") ON DELETE CASCADE,
  CONSTRAINT "LaunchJobItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "LaunchJobItem_launchJobId_idx" ON "LaunchJobItem"("launchJobId");
CREATE INDEX "LaunchJobItem_adAccountId_idx" ON "LaunchJobItem"("adAccountId");
