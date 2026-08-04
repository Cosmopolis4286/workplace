import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { DeliveryService } from '../../domains/operations/delivery/delivery.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { TelegramService } from '../../domains/engagement/telegram/telegram.service';
import { MailService } from '../../domains/engagement/mail/mail.service';

describe('DeliveryService — driver invitations & assignability', () => {
  let service: DeliveryService;
  let mockPrismaService: any;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockMailService: Partial<MailService>;

  const I18N_MESSAGES: Record<string, string> = {
    'delivery.driver.not_found': 'Repartidor no encontrado',
    'delivery.driver.not_found_in_commerce': 'Repartidor no encontrado en este comercio',
    'delivery.driver.not_active': 'El repartidor no está activo',
    'delivery.driver.kyc_required': 'Este repartidor debe verificar su identidad antes de recibir entregas.',
    'delivery.driver.grace_expired': 'Este repartidor no tiene una cuenta verificada vinculada. Invítalo a registrarse para volver a asignarle entregas.',
    'delivery.delivery.not_found': 'Entrega no encontrada',
    'delivery.invitation.not_found': 'Invitación no encontrada',
    'delivery.invitation.already_pending': 'Ya existe una invitación pendiente para este correo',
    'delivery.invitation.no_longer_pending': 'Esta invitación ya no está pendiente',
    'delivery.invitation.no_longer_available': 'Esta invitación ya no está disponible',
    'delivery.invitation.expired': 'Esta invitación expiró. Solicita una nueva.',
    'delivery.invitation.already_linked': 'Tu cuenta ya está vinculada como repartidor',
    'delivery.invitation.user_not_found': 'Usuario no encontrado',
  };
  const mockI18nService = {
    t: jest.fn((key: string) => I18N_MESSAGES[key] ?? key),
  };

  function baseInvitation(overrides: Partial<any> = {}) {
    return {
      id: 'invite-1',
      token: 'token-1',
      commerceId: 'commerce-1',
      email: 'driver@example.com',
      phone: null,
      name: null,
      status: 'PENDING',
      driverId: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function baseDriver(overrides: Partial<any> = {}) {
    return {
      id: 'driver-1',
      name: 'Juan Pérez',
      phone: '+58123',
      commerceId: 'commerce-1',
      isActive: true,
      userId: null,
      graceUntil: null,
      user: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService = {
      commerce: {
        findUnique: jest.fn().mockResolvedValue({ id: 'commerce-1', name: 'Comercio Uno' }),
      },
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      driverInvitation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      delivery: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockNotificationsService = {
      notifyDriverInvitationAccepted: jest.fn().mockResolvedValue(undefined),
    };

    mockMailService = {
      sendDriverInvitation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: TelegramService, useValue: {} },
        { provide: MailService, useValue: mockMailService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  describe('inviteDriver', () => {
    it('creates an invitation and sends the email', async () => {
      mockPrismaService.driverInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.driverInvitation.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...baseInvitation(), ...data })
      );

      const result = await service.inviteDriver('user-1', { email: 'driver@example.com' });

      expect(mockPrismaService.driverInvitation.create).toHaveBeenCalled();
      expect(mockMailService.sendDriverInvitation).toHaveBeenCalledWith(
        'driver@example.com',
        'Comercio Uno',
        result.token
      );
    });

    it('rejects when there is already a pending invitation for the same email', async () => {
      mockPrismaService.driverInvitation.findFirst.mockResolvedValue(baseInvitation());

      await expect(
        service.inviteDriver('user-1', { email: 'driver@example.com' })
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.driverInvitation.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelInvitation', () => {
    it('cancels a pending invitation owned by the commerce', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(baseInvitation());
      mockPrismaService.driverInvitation.update.mockResolvedValue(baseInvitation({ status: 'CANCELLED' }));

      const result = await service.cancelInvitation('user-1', 'invite-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancelling an invitation from another commerce', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(
        baseInvitation({ commerceId: 'other-commerce' })
      );

      await expect(service.cancelInvitation('user-1', 'invite-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects cancelling an invitation that is no longer pending', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(
        baseInvitation({ status: 'ACCEPTED' })
      );

      await expect(service.cancelInvitation('user-1', 'invite-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('creates a Driver linked to the accepting user and notifies the commerce', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(baseInvitation());
      mockPrismaService.driver.findUnique.mockResolvedValue(null); // no existing profile for this user
      mockPrismaService.user.findUnique.mockResolvedValue({
        firstName: 'Juan', lastName: 'Pérez', phone: '+58123',
      });
      const createdDriver = baseDriver({ userId: 'user-2' });
      mockPrismaService.$transaction.mockResolvedValue([
        createdDriver,
        baseInvitation({ status: 'ACCEPTED' }),
      ]);

      const result = await service.acceptInvitation('token-1', 'user-2');

      expect(result).toEqual(createdDriver);
      expect(mockNotificationsService.notifyDriverInvitationAccepted).toHaveBeenCalledWith(
        'commerce-1',
        createdDriver.name
      );
    });

    it('rejects when the invitation does not exist', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation('bad-token', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('rejects when the invitation already expired, and marks it EXPIRED', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(
        baseInvitation({ expiresAt: new Date(Date.now() - 1000) })
      );
      mockPrismaService.driverInvitation.update.mockResolvedValue(undefined);

      await expect(service.acceptInvitation('token-1', 'user-2')).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.driverInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('rejects when the accepting user is already linked to a driver profile', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(baseInvitation());
      mockPrismaService.driver.findUnique.mockResolvedValue(baseDriver({ userId: 'user-2' }));

      await expect(service.acceptInvitation('token-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('rejects when the invitation is not PENDING anymore', async () => {
      mockPrismaService.driverInvitation.findUnique.mockResolvedValue(
        baseInvitation({ status: 'CANCELLED' })
      );

      await expect(service.acceptInvitation('token-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignDriver — driver assignability', () => {
    function mockDriverLookups(driver: any) {
      // assignDriver hace su propio findUnique de ownership, y luego
      // assertDriverAssignable hace un segundo findUnique con include: user.
      mockPrismaService.driver.findUnique
        .mockResolvedValueOnce(driver)
        .mockResolvedValueOnce(driver);
    }

    beforeEach(() => {
      mockPrismaService.delivery.findUnique.mockResolvedValue({
        id: 'delivery-1', commerceId: 'commerce-1',
      });
      mockPrismaService.delivery.update.mockResolvedValue({ id: 'delivery-1', driverId: 'driver-1' });
      mockPrismaService.driver.update.mockResolvedValue({ id: 'driver-1' });
    });

    it('allows assigning a driver with an approved-KYC linked account', async () => {
      mockDriverLookups(
        baseDriver({ userId: 'user-2', user: { kycStatus: 'APPROVED' } })
      );

      await expect(
        service.assignDriver('user-1', 'delivery-1', 'driver-1')
      ).resolves.toBeDefined();
    });

    it('blocks assigning a driver with a linked account whose KYC is not approved', async () => {
      mockDriverLookups(
        baseDriver({ userId: 'user-2', user: { kycStatus: 'PENDING' } })
      );

      await expect(
        service.assignDriver('user-1', 'delivery-1', 'driver-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows assigning a legacy driver (no account) still within its grace period', async () => {
      mockDriverLookups(
        baseDriver({ userId: null, graceUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) })
      );

      await expect(
        service.assignDriver('user-1', 'delivery-1', 'driver-1')
      ).resolves.toBeDefined();
    });

    it('blocks assigning a legacy driver (no account) whose grace period expired', async () => {
      mockDriverLookups(
        baseDriver({ userId: null, graceUntil: new Date(Date.now() - 1000) })
      );

      await expect(
        service.assignDriver('user-1', 'delivery-1', 'driver-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
