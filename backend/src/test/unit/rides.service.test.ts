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
import { RideDriverProfilesService } from '../../domains/operations/rides/driver-profiles/ride-driver-profiles.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';

describe('RidesService', () => {
  let service: RidesService;
  let mockPrismaService: any;
  let mockPlatformFees: Partial<PlatformFeesFacade>;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockDriverProfiles: any;

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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
    };
    mockDriverProfiles = {
      getMine: jest.fn().mockResolvedValue({
        status: 'APPROVED',
        vehicleType: RideVehicleType.MOTORCYCLE,
      }),
      assertApprovedDriver: jest.fn().mockResolvedValue({
        status: 'APPROVED',
        vehicleType: RideVehicleType.MOTORCYCLE,
      }),
    };
    mockPlatformFees = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn().mockReturnValue({ feeAmount: 0 }),
      chargeProviderFee: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationsService = {
      notifyRideAccepted: jest.fn().mockResolvedValue(undefined),
      notifyRideStatusChanged: jest.fn().mockResolvedValue(undefined),
      notifyRideCancelledByOther: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RidesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFees },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RideDriverProfilesService, useValue: mockDriverProfiles },
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

      const [result] = await service.findAvailable(DRIVER_ID);

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
      mockPrismaService.ride.findUniqueOrThrow.mockResolvedValue(
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

    it('rechaza si el viaje ya empezó', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.IN_PROGRESS })
      );
      await expect(
        service.cancel(PASSENGER_ID, RIDE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancela la corrida PENDING del propio pasajero', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      mockPrismaService.ride.findUniqueOrThrow.mockResolvedValue(
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

  describe('conductores habilitados', () => {
    it('sin perfil de conductor aprobado no ve corridas disponibles', async () => {
      mockDriverProfiles.getMine.mockResolvedValue({ status: 'PENDING' });
      expect(await service.findAvailable(DRIVER_ID)).toEqual([]);
      expect(mockPrismaService.ride.findMany).not.toHaveBeenCalled();
    });

    it('solo ve corridas de su tipo de vehículo', async () => {
      mockPrismaService.ride.findMany.mockResolvedValue([]);
      await service.findAvailable(DRIVER_ID);
      const [args] = mockPrismaService.ride.findMany.mock.calls[0];
      expect(args.where.vehicleType).toBe(RideVehicleType.MOTORCYCLE);
    });

    it('no acepta una corrida que pide otro vehículo', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ vehicleType: RideVehicleType.CAR })
      );
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      await expect(service.accept(DRIVER_ID, RIDE_ID)).rejects.toThrow(
        'otro tipo de vehículo'
      );
    });

    it('si otro conductor la tomó primero, no se la queda', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(baseRide());
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      mockPrismaService.ride.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.accept(DRIVER_ID, RIDE_ID)).rejects.toThrow(
        'ya no está disponible'
      );
    });
  });

  describe('envíos con código de entrega', () => {
    it('un envío exige destinatario y genera el código, que ve el remitente', async () => {
      mockPrismaService.ride.findFirst.mockResolvedValue(null);
      mockPrismaService.ride.create.mockImplementation(({ data }: any) =>
        Promise.resolve(baseRide({ ...data }))
      );
      await expect(
        service.create(PASSENGER_ID, {
          origin: 'A',
          destination: 'B',
          serviceType: RideServiceType.FREIGHT,
        } as any)
      ).rejects.toThrow('quien recibe el envío');

      const res = await service.create(PASSENGER_ID, {
        origin: 'A',
        destination: 'B',
        serviceType: RideServiceType.FREIGHT,
        recipientName: 'Rosa',
        recipientPhone: '04141234567',
      } as any);
      expect(res.deliveryCode).toMatch(/^\d{4}$/);
    });

    it('el conductor no ve el código', async () => {
      mockPrismaService.ride.findMany.mockResolvedValue([
        baseRide({ deliveryCode: '1234', driverId: DRIVER_ID }),
      ]);
      const [r] = await service.findDriverRides(DRIVER_ID);
      expect(r).not.toHaveProperty('deliveryCode');
      expect(r.hasDeliveryCode).toBe(true);
    });

    it('no se completa un envío sin el código correcto', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({
          status: RideStatus.IN_PROGRESS,
          driverId: DRIVER_ID,
          deliveryCode: '1234',
        })
      );
      await expect(
        service.updateStatus(DRIVER_ID, RIDE_ID, RideStatus.COMPLETED, '9999')
      ).rejects.toThrow('código de entrega no coincide');
      expect(mockPrismaService.ride.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelar después de aceptar', () => {
    it('el pasajero cancela una aceptada con motivo y se avisa al conductor', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED, driverId: DRIVER_ID })
      );
      mockPrismaService.ride.findUniqueOrThrow.mockResolvedValue(
        baseRide({ status: RideStatus.CANCELLED })
      );
      await expect(service.cancel(PASSENGER_ID, RIDE_ID)).rejects.toThrow(
        'explica por qué'
      );
      await service.cancel(PASSENGER_ID, RIDE_ID, 'Ya no lo necesito');
      expect(
        mockNotificationsService.notifyRideCancelledByOther
      ).toHaveBeenCalledWith(
        DRIVER_ID,
        'El pasajero',
        'Ya no lo necesito',
        false
      );
    });

    it('el conductor la suelta y vuelve a estar disponible para otros', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED, driverId: DRIVER_ID })
      );
      const res = await service.driverCancel(DRIVER_ID, RIDE_ID, {
        reason: 'Se me dañó la moto',
      });
      expect(res).toEqual({ cancelled: false, requeued: true });
      const [args] = mockPrismaService.ride.updateMany.mock.calls[0];
      expect(args.data).toMatchObject({
        status: RideStatus.PENDING,
        driverId: null,
      });
    });

    it('si el pasajero no apareció, la corrida se cancela', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.ACCEPTED, driverId: DRIVER_ID })
      );
      const res = await service.driverCancel(DRIVER_ID, RIDE_ID, {
        reason: 'Esperé 15 minutos',
        noShow: true,
      });
      expect(res).toEqual({ cancelled: true, requeued: false });
      const [args] = mockPrismaService.ride.updateMany.mock.calls[0];
      expect(args.data.status).toBe(RideStatus.CANCELLED);
    });

    it('no puede cancelar una ya en curso ni una ajena', async () => {
      mockPrismaService.ride.findUnique.mockResolvedValue(
        baseRide({ status: RideStatus.IN_PROGRESS, driverId: DRIVER_ID })
      );
      await expect(
        service.driverCancel(DRIVER_ID, RIDE_ID, { reason: 'motivo largo' })
      ).rejects.toThrow('todavía no empezó');
      await expect(
        service.driverCancel('otro', RIDE_ID, { reason: 'motivo largo' })
      ).rejects.toThrow('Corrida no encontrada');
    });
  });
});
