import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WalletDepositRequestsService } from '../../domains/money/wallet-deposit-requests/wallet-deposit-requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../domains/money/wallets/wallets.service';

describe('WalletDepositRequestsService', () => {
  let service: WalletDepositRequestsService;
  let mockPrismaService: any;
  let mockWalletsService: Partial<WalletsService>;

  const USER_ID = 'user-1';
  const ADMIN_ID = 'admin-1';
  const REQUEST_ID = 'deposit-req-1';

  function pendingRequest(overrides: Partial<any> = {}) {
    return {
      id: REQUEST_ID,
      userId: USER_ID,
      amount: 50,
      paymentMethod: 'Zelle',
      reference: 'ABC123',
      proofImageUrl: 'private-wallet-deposit-proofs/foo.jpg',
      status: 'PENDING',
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      walletDepositRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ ...pendingRequest(), ...data })
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...pendingRequest(), status: 'REJECTED' }),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mockWalletsService = {
      deposit: jest.fn().mockResolvedValue({ transaction: { id: 'tx-1' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletDepositRequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = module.get<WalletDepositRequestsService>(
      WalletDepositRequestsService
    );
  });

  describe('review — aprobación', () => {
    const SUPER = Role.SUPERADMIN;

    it('reclama la solicitud de forma atómica, acredita vía deposit() y guarda la transacción', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.NORMAL,
      });

      const result = await service.review(REQUEST_ID, ADMIN_ID, SUPER, {
        status: 'APPROVED',
      } as any);

      expect(
        mockPrismaService.walletDepositRequest.updateMany
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID, status: 'PENDING' },
          data: expect.objectContaining({
            status: 'APPROVED',
            reviewedBy: ADMIN_ID,
          }),
        })
      );
      expect(mockWalletsService.deposit).toHaveBeenCalledWith(
        USER_ID,
        Role.NORMAL,
        expect.objectContaining({
          amount: 50,
          reference: `DEPOSIT-REQ-${REQUEST_ID}`,
        })
      );
      expect(result.resultingTransactionId).toBe('tx-1');
    });

    it('dos aprobaciones simultáneas: la que pierde el reclamo no acredita (evita doble acreditación)', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );
      mockPrismaService.walletDepositRequest.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.review(REQUEST_ID, ADMIN_ID, SUPER, {
          status: 'APPROVED',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockWalletsService.deposit).not.toHaveBeenCalled();
    });

    it('nadie puede aprobar su propia solicitud', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest({ userId: ADMIN_ID })
      );

      await expect(
        service.review(REQUEST_ID, ADMIN_ID, SUPER, {
          status: 'APPROVED',
        } as any)
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockWalletsService.deposit).not.toHaveBeenCalled();
    });

    it('un ADMIN puede rechazar pero no aprobar', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );

      await expect(
        service.review(REQUEST_ID, ADMIN_ID, Role.ADMIN, {
          status: 'APPROVED',
        } as any)
      ).rejects.toBeInstanceOf(ForbiddenException);

      await service.review(REQUEST_ID, ADMIN_ID, Role.ADMIN, {
        status: 'REJECTED',
        rejectionReason: 'Comprobante ilegible',
      } as any);
      expect(mockWalletsService.deposit).not.toHaveBeenCalled();
      expect(
        mockPrismaService.walletDepositRequest.updateMany
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionReason: 'Comprobante ilegible',
          }),
        })
      );
    });

    it('si deposit() falla la solicitud vuelve a PENDING', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.NORMAL,
      });
      (mockWalletsService.deposit as jest.Mock).mockRejectedValue(
        new BadRequestException('límite')
      );

      await expect(
        service.review(REQUEST_ID, ADMIN_ID, SUPER, {
          status: 'APPROVED',
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        mockPrismaService.walletDepositRequest.update
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.review(REQUEST_ID, ADMIN_ID, SUPER, {
          status: 'APPROVED',
        } as any)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolveImageFilename', () => {
    it('permite al dueño de la solicitud ver su comprobante', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );

      const filename = await service.resolveImageFilename(
        REQUEST_ID,
        USER_ID,
        Role.NORMAL
      );
      expect(filename).toBe('foo.jpg');
    });

    it('permite a un admin ver el comprobante de otro usuario', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );

      const filename = await service.resolveImageFilename(
        REQUEST_ID,
        ADMIN_ID,
        Role.ADMIN
      );
      expect(filename).toBe('foo.jpg');
    });

    it('rechaza a un usuario que no es el dueño ni admin', async () => {
      mockPrismaService.walletDepositRequest.findUnique.mockResolvedValue(
        pendingRequest()
      );

      await expect(
        service.resolveImageFilename(REQUEST_ID, 'other-user', Role.NORMAL)
      ).rejects.toThrow('No tienes permiso para ver este comprobante');
    });
  });
});
