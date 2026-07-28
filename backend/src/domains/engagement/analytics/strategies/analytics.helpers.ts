// Helpers de fecha/formato compartidos por ambas estrategias de analytics
// (comercio y freelancer) — extraídos tal cual de analytics.service.ts.

import { BadRequestException } from '@nestjs/common';

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return startOfDay(new Date(d.setDate(diff)));
}

export function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return startOfDay(new Date(d.getFullYear(), q * 3, 1));
}

export function getPeriodRange(
  period: string,
  dateFrom?: string,
  dateTo?: string
): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(new Date());

  switch (period) {
    case 'today':
      // from = start of today, to = now
      return { from, to };
    case 'week':
      return { from: startOfWeek(new Date()), to };
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case 'quarter':
      return { from: startOfQuarter(new Date()), to };
    case '90d':
      from.setDate(from.getDate() - 89);
      break;
    case '1y':
      from.setFullYear(from.getFullYear() - 1);
      from.setDate(from.getDate() + 1);
      break;
    case 'custom':
      if (!dateFrom || !dateTo) {
        throw new BadRequestException(
          'dateFrom and dateTo are required for custom period'
        );
      }
      return {
        from: startOfDay(new Date(dateFrom)),
        to: endOfDay(new Date(dateTo)),
      };
    case '30d':
    default:
      from.setDate(from.getDate() - 29);
  }

  return { from, to };
}

export function getPreviousPeriodRange(
  period: string,
  compareWith: string,
  current: { from: Date; to: Date }
): { from: Date; to: Date } | null {
  if (compareWith === 'none') return null;

  const duration = current.to.getTime() - current.from.getTime();

  if (compareWith === 'year') {
    return {
      from: new Date(current.from.getTime() - 365 * 24 * 60 * 60 * 1000),
      to: new Date(current.to.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
  }

  // previous period
  return {
    from: new Date(current.from.getTime() - duration - 1),
    to: new Date(current.from.getTime() - 1),
  };
}

export function pct(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
