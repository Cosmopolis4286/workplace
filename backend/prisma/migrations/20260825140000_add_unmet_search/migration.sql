-- CreateTable
CREATE TABLE "unmet_searches" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unmet_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unmet_searches_createdAt_idx" ON "unmet_searches"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "unmet_searches_city_idx" ON "unmet_searches"("city");
