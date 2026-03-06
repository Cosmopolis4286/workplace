-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD', 'EXPORT', 'VIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT,
    "userEmail"   TEXT,
    "userRole"    TEXT,
    "action"      "AuditAction" NOT NULL DEFAULT 'OTHER',
    "module"      TEXT NOT NULL,
    "entityId"    TEXT,
    "summary"     TEXT NOT NULL,
    "details"     JSONB,
    "ip"          TEXT,
    "userAgent"   TEXT,
    "statusCode"  INTEGER,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id"        TEXT NOT NULL,
    "level"     "LogLevel" NOT NULL DEFAULT 'INFO',
    "message"   TEXT NOT NULL,
    "context"   TEXT,
    "stack"     TEXT,
    "meta"      JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");
CREATE INDEX "system_logs_createdAt_idx" ON "system_logs"("createdAt" DESC);
