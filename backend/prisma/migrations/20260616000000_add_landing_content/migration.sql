-- CreateTable
CREATE TABLE "landing_testimonials" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "initials" TEXT NOT NULL DEFAULT '',
    "avatarColor" TEXT NOT NULL DEFAULT '#EF4444',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_stats" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isDynamic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_stats_key_key" ON "landing_stats"("key");
