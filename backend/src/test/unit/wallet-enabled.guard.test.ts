import { ForbiddenException } from '@nestjs/common';
import { WalletEnabledGuard } from '../../common/guards/wallet-enabled.guard';

describe('WalletEnabledGuard', () => {
  const previous = process.env.PROTECTED_PAYMENTS_ENABLED;
  afterEach(() => {
    if (previous === undefined) delete process.env.PROTECTED_PAYMENTS_ENABLED;
    else process.env.PROTECTED_PAYMENTS_ENABLED = previous;
  });

  it('cierra la billetera con el Pago Protegido apagado (por defecto)', () => {
    delete process.env.PROTECTED_PAYMENTS_ENABLED;
    expect(() => new WalletEnabledGuard().canActivate()).toThrow(
      ForbiddenException
    );
  });

  it('la abre solo con PROTECTED_PAYMENTS_ENABLED=true', () => {
    process.env.PROTECTED_PAYMENTS_ENABLED = 'true';
    expect(new WalletEnabledGuard().canActivate()).toBe(true);
  });
});
