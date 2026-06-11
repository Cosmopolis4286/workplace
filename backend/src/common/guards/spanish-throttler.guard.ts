import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class SpanishThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly i18n: I18nService
  ) {
    super(options, storageService, reflector);
  }

  protected async getErrorMessage(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<string> {
    const lang = I18nContext.current(context)?.lang;
    const seconds = Math.ceil(throttlerLimitDetail.timeToExpire);
    const wait =
      seconds < 60
        ? this.i18n.t('common.rate_limit.wait_seconds', { lang, args: { count: seconds } })
        : this.i18n.t('common.rate_limit.wait_minutes', {
            lang,
            args: { count: Math.ceil(seconds / 60) },
          });

    return this.i18n.t('common.rate_limit.exceeded', { lang, args: { wait } });
  }
}
