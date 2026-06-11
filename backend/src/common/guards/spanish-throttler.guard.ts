import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class SpanishThrottlerGuard extends ThrottlerGuard {
  protected async getErrorMessage(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<string> {
    const seconds = Math.ceil(throttlerLimitDetail.timeToExpire);
    const wait =
      seconds < 60
        ? `${seconds} segundo${seconds === 1 ? '' : 's'}`
        : `${Math.ceil(seconds / 60)} minuto${Math.ceil(seconds / 60) === 1 ? '' : 's'}`;

    return `Demasiadas solicitudes. Intenta de nuevo en ${wait}.`;
  }
}
