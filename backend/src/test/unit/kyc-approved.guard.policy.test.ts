import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KycStatus, Role } from '@prisma/client';
import { KYC_POLICY_OPERATION } from '../../common/decorators/require-kyc-operation.decorator';
import { KycApprovedGuard } from '../../common/guards/kyc-approved.guard';

describe('KycApprovedGuard — política progresiva', () => {
  const handler = () => undefined;
  const controller = class TestController {};
  let reflector: Reflector;
  let policy: { evaluate: jest.Mock };
  let guard: KycApprovedGuard;

  function context(user: Record<string, unknown>): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    policy = { evaluate: jest.fn() };
    guard = new KycApprovedGuard(reflector, policy as any);
    Reflect.deleteMetadata(KYC_POLICY_OPERATION, handler);
  });

  it('evalúa la operación declarada y permite un nivel suficiente', async () => {
    Reflect.defineMetadata(KYC_POLICY_OPERATION, 'catalog.order', handler);
    policy.evaluate.mockResolvedValue({ allowed: true });

    await expect(
      guard.canActivate(
        context({
          id: 'user-1',
          role: Role.NORMAL,
          kycStatus: KycStatus.APPROVED,
        })
      )
    ).resolves.toBe(true);

    expect(policy.evaluate).toHaveBeenCalledWith('catalog.order', {
      authenticated: true,
      phoneVerified: false,
      kycStatus: KycStatus.APPROVED,
    });
  });

  it('rechaza cuando la política exige un nivel no acreditado', async () => {
    Reflect.defineMetadata(KYC_POLICY_OPERATION, 'catalog.order', handler);
    policy.evaluate.mockResolvedValue({
      allowed: false,
      reason: 'Requiere revisión reforzada.',
    });

    await expect(
      guard.canActivate(
        context({
          id: 'user-1',
          role: Role.NORMAL,
          kycStatus: KycStatus.APPROVED,
        })
      )
    ).rejects.toThrow(new ForbiddenException('Requiere revisión reforzada.'));
  });

  it('no confía en flags de teléfono o revisión reforzada enviados en request.user', async () => {
    Reflect.defineMetadata(KYC_POLICY_OPERATION, 'catalog.order', handler);
    policy.evaluate.mockResolvedValue({
      allowed: false,
      reason: 'No autorizado',
    });

    await expect(
      guard.canActivate(
        context({
          id: 'user-1',
          role: Role.NORMAL,
          kycStatus: KycStatus.APPROVED,
          phoneVerified: true,
          enhancedReviewApproved: true,
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(policy.evaluate).toHaveBeenCalledWith('catalog.order', {
      authenticated: true,
      phoneVerified: false,
      kycStatus: KycStatus.APPROVED,
    });
  });

  it('mantiene el comportamiento KYC anterior para rutas aún no clasificadas', async () => {
    await expect(
      guard.canActivate(
        context({
          id: 'user-1',
          role: Role.NORMAL,
          kycStatus: KycStatus.PENDING,
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      guard.canActivate(
        context({
          id: 'user-1',
          role: Role.NORMAL,
          kycStatus: KycStatus.APPROVED,
        })
      )
    ).resolves.toBe(true);
    expect(policy.evaluate).not.toHaveBeenCalled();
  });

  it('conserva la excepción de personal administrativo', async () => {
    await expect(
      guard.canActivate(context({ id: 'admin', role: Role.ADMIN }))
    ).resolves.toBe(true);
    expect(policy.evaluate).not.toHaveBeenCalled();
  });
});
