-- CreateEnum
CREATE TYPE "PostMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable: posts
CREATE TABLE "posts" (
  "id"         TEXT NOT NULL,
  "caption"    TEXT,
  "userId"     TEXT NOT NULL,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_media
CREATE TABLE "post_media" (
  "id"     TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "url"    TEXT NOT NULL,
  "type"   "PostMediaType" NOT NULL DEFAULT 'IMAGE',
  "order"  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable: follows
CREATE TABLE "follows" (
  "id"          TEXT NOT NULL,
  "followerId"  TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reviews
CREATE TABLE "reviews" (
  "id"        TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "comment"   TEXT,
  "authorId"  TEXT NOT NULL,
  "targetId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_userId_createdAt_idx" ON "posts"("userId", "createdAt" DESC);
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");
CREATE UNIQUE INDEX "reviews_authorId_targetId_key" ON "reviews"("authorId", "targetId");
CREATE INDEX "reviews_targetId_idx" ON "reviews"("targetId");

-- AddForeignKey
ALTER TABLE "posts"      ADD CONSTRAINT "posts_userId_fkey"      FOREIGN KEY ("userId")     REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_postId_fkey" FOREIGN KEY ("postId")     REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows"    ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows"    ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews"    ADD CONSTRAINT "reviews_authorId_fkey"  FOREIGN KEY ("authorId")   REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews"    ADD CONSTRAINT "reviews_targetId_fkey"  FOREIGN KEY ("targetId")   REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
