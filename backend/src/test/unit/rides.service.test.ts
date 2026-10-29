import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RideStatus, RideVehicleType, RideServiceType } from '@prisma/client';
import { RidesService } from '../../domains/operations/rides/rides.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PLATFORM_FEES_FACADE,
  PlatformFeesFacade,
} from '../../domains/money/platform-fees/platform-fees.facade';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';

describe('RidesService', () => {
  let service: RidesService;
  let mockPrismaService: any;
  let mockPlatformFees: Partial<PlatformFeesFacade>;
  let mockNotificationsService: Partial<NotificationsService>;

  const PASSENGER_ID = 'passenger-1';
  const DRIVER_ID = 'driver-1';
  const RIDE_ID = 'ride-1';

  function baseRide(overrides: Partial<any> = {}) {
    return {
      id: RIDE_ID,
      serviceType: RideServiceType.PASSENGER,
      status: RideStatus.PENDING,
      vehicleType: RideVehicleType.MOTORCYCLE,
      price: 50,
      distance: 3,
      duration: 10,
      passengerId: PASSENGER_ID,
      driverId: null,
      platformFeeRate: undefined,
      platformFeeAmount: undefined,
      platformFeePayer: undefined,
      passenger: {
        id: PASSENGER_ID,
        firstName: 'Cliente',
        lastName: 'Uno',
        phone: '+58111',
      },
      driver: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      ride: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    mockPlatformFees = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn().mockReturnValue({ feeAmount: 0 }),
      chargeProviderFee: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationsService = {
      notifyRideAccepted: jest.fn().mockResolvedValue(undefined),
      notifyRideStatusChanged: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RidesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFees },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<RidesService>(RidesService);
  });

  describe('create', () => {
    it('rechaza si el pasajero ya tiene un viaje activo', async () => {
      mockPrismaService.ride.findFirst.mockResolvedValue(baseRide());

      await expect(
        service.create(PASSENGER_ID, {
          origin: 'A',
          destination: 'B',
          vehicleType: RideVehicleType.MOTORCYCLE,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.ride.create).not.toHaveBeenCalled();
    });

    it('calcula precio cuando hay coordenadas y crea la corrida', async () => {
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      mockPrismaService.ride.create.mockResolvedValue(baseRide());

      const result = await service.create(PASSENGER_ID, {
        origin: 'A',
        destination: 'B',
        originLat: 10,
        originLng: -66,
        destinationLat: 10.1,
        destinationLng: -66.1,
        vehicleType: RideVehicleType.CAR,
      } as any);

      expect(mockPrismaService.ride.create).toHaveBeenCalled();
      const createArgs = mockPrismaService.ride.create.mock.calls[0][0];
      expect(createArgs.data.price).toBeGreaterThan(0);
      expect(result.passengerId).toBe(PASSENGER_ID);
    });

    it('agrega la comisión de plataforma al precio cuando el pagador es CLIENT', async () => {
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      (mockPlatformFees.resolveFeeConfig as jest.Mock).mockResolvedValue({
        rate: 10,
        payer: 'CLIENT',
      });
      (mockPlatformFees.calculateFee as jest.Mock).mockReturnValue({
        feeAmount: 5,
      });
      mockPrismaService.ride.create.mockResolvedValue(
        baseRide({
          price: 55,
          platformFeeAmount: 5,
          platformFeePayer: 'CLIENT',
        })
      );

      await service.create(PASSENGER_ID, {
        origin: 'A',
        destination: 'B',
        originLat: 10,
        originLng: -66,
        destinationLat: 10.1,
        destinationLng: -66.1,
        vehicleType: RideVehicleType.CAR,
      } as any);

      const createArgs = mockPrismaService.ride.create.mock.calls[0][0];
      expect(createArgs.data.platformFeePayer).toBe('CLIENT');
      expect(createArgs.data.platformFeeAmount).toBe(5);
    });
  });

  describe('findAvailable', () => {
    it('oculta el teléfono del pasajero antes de que un conductor acepte', async () => {
      mockPrismaService.ride.findMany.mockResolvedValue([baseRide()]);

      const [result] = await service.findAvailable();

      expect(result.passengerName).toBe('Cliente Uno');
      expect(result.passengerPhone).toBeUndefined();
    });
  });

  describe('accept', () => {
    it('lanza NotFoundException si la corrida no existe', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(null);
      await expect(service.accept(DRIVER_ID, RIDE_ID)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('rechaza si la corrida ya no está PENDING', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED })
      );
      await expect(service.accept(DRIVER_ID, RIDE_ID)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('rechaza si el conductor es el mismo pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      await expect(
        service.accept(PASSENGER_ID, RIDE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el conductor ya tiene un viaje activo', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      mockPrismaService.ride.findFirst.mockResolvedValue(
        baseRide({
          id: 'other-ride',
          driverId: DRIVER_ID,
          status: RideStatus.ACCEPTED,
        })
      );

      await expect(service.accept(DRIVER_ID, RIDE_ID)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('acepta la corrida y notifica al pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({
          status: RideStatus.ACCEPTED,
          driverId: DRIVER_ID,
          driver: {
            id: DRIVER_ID,
            firstName: 'Conductor',
            lastName: 'Uno',
            phone: '+58222',
          },
        })
      );

      const result = await service.accept(DRIVER_ID, RIDE_ID);

      expect(result.status).toBe(RideStatus.ACCEPTED);
      expect(mockNotificationsService.notifyRideAccepted).toHaveBeenCalledWith(
        PASSENGER_ID,
        'Conductor Uno'
      );
    });
  });

  describe('updateStatus', () => {
    it('rechaza una transición no permitida', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.PENDING, driverId: DRIVER_ID })
      );

      await expect(
        service.updateStatus(DRIVER_ID, RIDE_ID, RideStatus.COMPLETED)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si quien actualiza no es el conductor asignado', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED, driverId: DRIVER_ID })
      );

      await expect(
        service.updateStatus('otro-usuario', RIDE_ID, RideStatus.IN_PROGRESS)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('avanza a IN_PROGRESS y notifica al pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED, driverId: DRIVER_ID })
      );
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({
          status: RideStatus.IN_PROGRESS,
          driverId: DRIVER_ID,
          driver: {
            id: DRIVER_ID,
            firstName: 'Conductor',
            lastName: 'Uno',
            phone: '+58222',
          },
        })
      );

      const result = await service.updateStatus(
        DRIVER_ID,
        RIDE_ID,
        RideStatus.IN_PROGRESS
      );

      expect(result.status).toBe(RideStatus.IN_PROGRESS);
      expect(
        mockNotificationsService.notifyRideStatusChanged
      ).toHaveBeenCalledWith(
        PASSENGER_ID,
        'Conductor Uno',
        RideStatus.IN_PROGRESS
      );
    });

    it('al completar, cobra la comisión al conductor si el pagador es PROVIDER', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({
          status: RideStatus.IN_PROGRESS,
          driverId: DRIVER_ID,
          price: 50,
          platformFeePayer: undefined,
        })
      );
      (mockPlatformFees.resolveFeeConfig as jest.Mock).mockResolvedValue({
        rate: 10,
        payer: 'PROVIDER',
      });
      (mockPlatformFees.calculateFee as jest.Mock).mockReturnValue({
        feeAmount: 5,
      });
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({
          status: RideStatus.COMPLETED,
          driverId: DRIVER_ID,
          platformFeeAmount: 5,
          platformFeePayer: 'PROVIDER',
        })
      );

      await service.updateStatus(DRIVER_ID, RIDE_ID, RideStatus.COMPLETED);

      expect(mockPlatformFees.chargeProviderFee).toHaveBeenCalledWith(
        'RIDE',
        DRIVER_ID,
        5,
        `FEE-RIDE-${RIDE_ID}`,
        { rideId: RIDE_ID }
      );
    });

    it('al completar, registra al conductor la comisión que pagó el pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({
          status: RideStatus.IN_PROGRESS,
          driverId: DRIVER_ID,
          price: 55,
          platformFeePayer: 'CLIENT',
          platformFeeAmount: 5,
        })
      );
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({ status: RideStatus.COMPLETED, driverId: DRIVER_ID })
      );

      await service.updateStatus(DRIVER_ID, RIDE_ID, RideStatus.COMPLETED);

      expect(mockPlatformFees.chargeProviderFee).toHaveBeenCalledWith(
        'RIDE',
        DRIVER_ID,
        5,
        `FEE-RIDE-${RIDE_ID}`,
        { rideId: RIDE_ID, payer: 'CLIENT' }
      );
    });

    it('no vuelve a cobrar comisión si ya se cobró al conductor', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({
          status: RideStatus.IN_PROGRESS,
          driverId: DRIVER_ID,
          price: 50,
          platformFeePayer: 'PROVIDER',
        })
      );
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({ status: RideStatus.COMPLETED, driverId: DRIVER_ID })
      );

      await service.updateStatus(DRIVER_ID, RIDE_ID, RideStatus.COMPLETED);

      expect(mockPlatformFees.chargeProviderFee).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('rechaza si quien cancela no es el pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      await expect(
        service.cancel('otro-usuario', RIDE_ID)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza si la corrida no está PENDING', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED })
      );
      await expect(
        service.cancel(PASSENGER_ID, RIDE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancela la corrida PENDING del propio pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      mockPrismaService.ride.update.mockResolvedValue(
        baseRide({ status: RideStatus.CANCELLED })
      );

      const result = await service.cancel(PASSENGER_ID, RIDE_ID);
      expect(result.status).toBe(RideStatus.CANCELLED);
    });
  });

  describe('findOne', () => {
    it('permite acceso al pasajero y al conductor, rechaza a terceros', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ driverId: DRIVER_ID })
      );

      await expect(
        service.findOne(PASSENGER_ID, RIDE_ID)
      ).resolves.toBeDefined();
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ driverId: DRIVER_ID })
      );
      await expect(service.findOne(DRIVER_ID, RIDE_ID)).resolves.toBeDefined();
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ driverId: DRIVER_ID })
      );
      await expect(service.findOne('intruso', RIDE_ID)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('sí expone el teléfono del pasajero al conductor ya asignado', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ driverId: DRIVER_ID })
      );

      const result = await service.findOne(DRIVER_ID, RIDE_ID);
      expect(result.passengerPhone).toBe('+58111');
    });
  });
});
