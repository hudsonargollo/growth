-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviews" INTEGER NOT NULL,
    "affiliateLink" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "sourceApi" TEXT NOT NULL DEFAULT '',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_entries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "market" TEXT NOT NULL,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "provenance" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "catalogEntryId" TEXT,
    "blueprintId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "prompt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voiceovers" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '',
    "voiceModel" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL DEFAULT '',
    "bitrate" TEXT NOT NULL DEFAULT '128kbps',
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "similarityBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voiceovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_jobs" (
    "id" TEXT NOT NULL,
    "editorContact" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "voiceoverId" TEXT,
    "scriptUrl" TEXT NOT NULL,
    "voiceoverUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reply_jobs" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "reply" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'AI',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reply_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_credentials" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "login" TEXT NOT NULL DEFAULT '',
    "passwordEncrypted" TEXT NOT NULL DEFAULT '',
    "iv" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tool_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mining_sessions" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mining_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_credentials_toolId_key" ON "tool_credentials"("toolId");

-- AddForeignKey
ALTER TABLE "catalog_entries" ADD CONSTRAINT "catalog_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "catalog_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voiceovers" ADD CONSTRAINT "voiceovers_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_voiceoverId_fkey" FOREIGN KEY ("voiceoverId") REFERENCES "voiceovers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
