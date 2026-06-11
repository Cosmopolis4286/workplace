import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, LogLevel, Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action?: AuditAction;
  module: string;
  entityId?: string;
  summary: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // ─── Write ────────────────────────────────────────────────────────────────

  async log(params: CreateAuditLogParams) {
    try {
      await this.prisma.auditLog.create({ data: params as any });
    } catch {
      // Fire-and-forget — never throw
    }
  }

  async logSystem(
    level: LogLevel,
    message: string,
    context?: string,
    stack?: string,
    meta?: Record<string, any>
  ) {
    try {
      const data: any = { level, message, context, meta: meta as any };
      if (stack) data.stack = stack; // Only include if has value
      await this.prisma.systemLog.create({ data });
    } catch {
      // Fire-and-forget
    }
  }

  // ─── Read: Audit ──────────────────────────────────────────────────────────

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    module?: string;
    action?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const {
      page = 1,
      limit = 50,
      userId,
      module,
      action,
      search,
      dateFrom,
      dateTo,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (action) where.action = action as AuditAction;
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAuditStats() {
    const [total, byModule, byAction, recentUsers] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['module'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({ by: ['action'], _count: { id: true } }),
      this.prisma.auditLog.findMany({
        distinct: ['userId'],
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { userId: true, userEmail: true, userRole: true },
      }),
    ]);

    return { total, byModule, byAction, recentUsers };
  }

  // ─── Read: System Logs ────────────────────────────────────────────────────

  async getSystemLogs(params: {
    page?: number;
    limit?: number;
    level?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page = 1, limit = 100, level, search, dateFrom, dateTo } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SystemLogWhereInput = {};

    if (level) where.level = level as LogLevel;
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { context: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLogStats() {
    const [total, byLevel] = await Promise.all([
      this.prisma.systemLog.count(),
      this.prisma.systemLog.groupBy({ by: ['level'], _count: { id: true } }),
    ]);
    return { total, byLevel };
  }
}
