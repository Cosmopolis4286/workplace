-- Incremented atomically on password reset to invalidate all existing JWTs.
ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
