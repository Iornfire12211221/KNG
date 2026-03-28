-- Создание таблиц для базы данных

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isKicked" BOOLEAN NOT NULL DEFAULT false,
    "locationPermission" BOOLEAN NOT NULL DEFAULT false,
    "lastPostTime" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Таблица постов
CREATE TABLE IF NOT EXISTS "posts" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "landmark" TEXT,
    "timestamp" BIGINT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "likedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photo" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsModeration" BOOLEAN NOT NULL DEFAULT true,
    "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationScore" DOUBLE PRECISION,
    "moderationReason" TEXT,
    "moderatedAt" BIGINT,
    "moderatedBy" TEXT,
    "isRelevant" BOOLEAN NOT NULL DEFAULT true,
    "relevanceScore" DOUBLE PRECISION,
    "relevanceCheckedAt" BIGINT,
    "roadType" TEXT,
    "weather" TEXT,
    "trafficImpact" TEXT NOT NULL DEFAULT 'MINOR',
    "emergencyServices" BOOLEAN NOT NULL DEFAULT false,
    "casualties" INTEGER NOT NULL DEFAULT 0,
    "clusterId" TEXT,
    "accuracy" DOUBLE PRECISION,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- Таблица комментариев
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userPhotoUrl" TEXT,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Таблица модерации ИИ
CREATE TABLE IF NOT EXISTS "ai_moderation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "toxicityScore" DOUBLE PRECISION,
    "relevanceScore" DOUBLE PRECISION,
    "severityScore" DOUBLE PRECISION,
    "categoryScore" DOUBLE PRECISION,
    "detectedLanguage" TEXT,
    "keyPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_moderation_pkey" PRIMARY KEY ("id")
);

-- Таблица статистики
CREATE TABLE IF NOT EXISTS "post_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "dpsPosts" INTEGER NOT NULL DEFAULT 0,
    "patrolPosts" INTEGER NOT NULL DEFAULT 0,
    "accidentPosts" INTEGER NOT NULL DEFAULT 0,
    "cameraPosts" INTEGER NOT NULL DEFAULT 0,
    "roadworkPosts" INTEGER NOT NULL DEFAULT 0,
    "animalPosts" INTEGER NOT NULL DEFAULT 0,
    "lowSeverity" INTEGER NOT NULL DEFAULT 0,
    "mediumSeverity" INTEGER NOT NULL DEFAULT 0,
    "highSeverity" INTEGER NOT NULL DEFAULT 0,
    "pendingModeration" INTEGER NOT NULL DEFAULT 0,
    "approvedPosts" INTEGER NOT NULL DEFAULT 0,
    "rejectedPosts" INTEGER NOT NULL DEFAULT 0,
    "aiModerationTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "uniqueLocations" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_stats_pkey" PRIMARY KEY ("id")
);

-- Таблица кластеров
CREATE TABLE IF NOT EXISTS "post_clusters" (
    "id" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_clusters_pkey" PRIMARY KEY ("id")
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS "users_telegramId_idx" ON "users"("telegramId");
CREATE INDEX IF NOT EXISTS "posts_latitude_longitude_idx" ON "posts"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "posts_expiresAt_idx" ON "posts"("expiresAt");
CREATE INDEX IF NOT EXISTS "posts_moderationStatus_idx" ON "posts"("moderationStatus");
CREATE INDEX IF NOT EXISTS "posts_clusterId_idx" ON "posts"("clusterId");
CREATE INDEX IF NOT EXISTS "ai_moderation_postId_idx" ON "ai_moderation"("postId");
CREATE INDEX IF NOT EXISTS "ai_moderation_processedAt_idx" ON "ai_moderation"("processedAt");
CREATE INDEX IF NOT EXISTS "post_stats_date_idx" ON "post_stats"("date");
CREATE INDEX IF NOT EXISTS "post_clusters_centerLat_centerLng_idx" ON "post_clusters"("centerLat", "centerLng");

