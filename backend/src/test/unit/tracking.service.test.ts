import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { TrackingService } from '../../domains/operations/delivery/tracking/tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RoutingService } from '../../domains/operations/delivery/routing/routing.service';

describe('TrackingService', () => {
  let service: TrackingService;
  let mockPrismaService: any;
  let mockRedisService: any;
  let mockRoutingService: any;

  function baseDelivery(overrides: Partial<any> = {}) {
    return {
      id: 'delivery-1',
      status: DeliveryStatus.IN_TRANSIT,
      trackingActive: true,
      customerUserId: 'customer-1',
      pickupLat: 10.48,
      pickupLng: -66.9,
      destLat: 10.49,
      destLng: -66.89,
      driver: {
        id: 'driver-1',
        userId: 'driver-user-1',
        name: 'Juan',
        vehicleType: 'MOTORCYCLE',
        phone: null,
      },
      commerce: { userId: 'commerce-user-1' },
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      delivery: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    mockRoutingService = {
      calculateRoute: jest.fn().mockResolvedValue({
        distanceMeters: 800,
        durationSeconds: 240,
        geometry: { type: 'LineString', coordinates: [] },
        provider: 'osrm',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RoutingService, useValue: mockRoutingService },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  // ─── findMyActiveDeliveries (vista del repartidor) ──────────────────────

  describe('findMyActiveDeliveries', () => {
    it('returns active deliveries for the driver linked to this user', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 'driver-1',
        userId: 'driver-user-1',
      });
      mockPrismaService.delivery.findMany.mockResolvedValue([
        { id: 'delivery-1', status: DeliveryStatus.IN_TRANSIT },
      ]);

      const result = await service.findMyActiveDeliveries('driver-user-1');

      expect(mockPrismaService.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ driverId: 'driver-1' }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('returns an empty list when the user has no linked Driver profile', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      const result = await service.findMyActiveDeliveries('random-user');

      expect(result).toEqual([]);
      expect(mockPrismaService.delivery.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── assertCanView (autorización) ────────────────────────────────────────

  describe('assertCanView', () => {
    it('allows the customer who owns the delivery', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      await expect(
        service.assertCanView('delivery-1', 'customer-1')
      ).resolves.toBeDefined();
    });

    it('allows the assigned driver', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      await expect(
        service.assertCanView('delivery-1', 'driver-user-1')
      ).resolves.toBeDefined();
    });

    it('allows the commerce owner', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      await expect(
        service.assertCanView('delivery-1', 'commerce-user-1')
      ).resolves.toBeDefined();
    });

    it('rejects a user unrelated to the delivery', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      await expect(
        service.assertCanView('delivery-1', 'random-user')
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the delivery does not exist', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(null);
      await expect(
        service.assertCanView('missing', 'customer-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── publishLocation (autorización + throttling) ────────────────────────

  describe('publishLocation', () => {
    const dto = { lat: 10.485, lng: -66.895 };

    it('allows the assigned driver to publish while tracking is active', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      const result = await service.publishLocation(
        'delivery-1',
        'driver-user-1',
        dto
      );
      expect(result.accepted).toBe(true);
      expect(mockRedisService.setex).toHaveBeenCalled();
      expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'driver-1' } })
      );
    });

    it('rejects a user who is not the assigned driver', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      await expect(
        service.publishLocation('delivery-1', 'customer-1', dto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects publishing when the delivery is not currently tracking (finished/cancelled)', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(
        baseDelivery({
          trackingActive: false,
          status: DeliveryStatus.DELIVERED,
        })
      );
      await expect(
        service.publishLocation('delivery-1', 'driver-user-1', dto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the delivery does not exist', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(null);
      await expect(
        service.publishLocation('missing', 'driver-user-1', dto)
      ).rejects.toThrow(NotFoundException);
    });

    it('throttles updates that are too close in time and distance to the last known position', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue(baseDelivery());
      const recent = {
        lat: 10.4851,
        lng: -66.8951, // ~a few meters away
        recordedAt: new Date().toISOString(),
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify(recent));

      const result = await service.publishLocation(
        'delivery-1',
        'driver-user-1',
        {
          lat: 10.48511,
          lng: -66.89511,
        }
      );

      expect(result.accepted).toBe(false);
      expect(mockRedisService.setex).not.toHaveBeenCalled();
    });
  });

  // ─── syncTrackingActive ──────────────────────────────────────────────────

  describe('syncTrackingActive', () => {
    it('activates tracking when the status is trackable and it was previously off', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue({
        trackingActive: false,
      });
      const result = await service.syncTrackingActive(
        'delivery-1',
        DeliveryStatus.ASSIGNED
      );
      expect(result).toBe(true);
      expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: 'delivery-1' },
        data: { trackingActive: true },
      });
    });

    it('deactivates tracking and clears the Redis location + route cache on a terminal status', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue({
        trackingActive: true,
      });
      const result = await service.syncTrackingActive(
        'delivery-1',
        DeliveryStatus.DELIVERED
      );
      expect(result).toBe(false);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'tracking:delivery:delivery-1'
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'tracking:route:delivery-1'
      );
    });

    it('is a no-op when the value would not change', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue({
        trackingActive: true,
      });
      await service.syncTrackingActive('delivery-1', DeliveryStatus.IN_TRANSIT);
      expect(mockPrismaService.delivery.update).not.toHaveBeenCalled();
    });
  });

  // ─── getSnapshot (ETA / ruta) ─────────────────────────────────────────────

  describe('getSnapshot', () => {
    it('computes a route/ETA when pickup, destination and driver are all known', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery()
      );

      const snapshot = await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).toHaveBeenCalled();
      expect(snapshot.route).toEqual(
        expect.objectContaining({
          distanceMeters: 800,
          durationSeconds: 240,
          provider: 'osrm',
        })
      );
    });

    it('uses the last known driver location as the route origin, not the pickup point, once en route', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery()
      );
      mockRedisService.get.mockImplementation((key: string) =>
        key.startsWith('tracking:delivery:')
          ? Promise.resolve(
              JSON.stringify({
                lat: 10.487,
                lng: -66.892,
                recordedAt: new Date().toISOString(),
              })
            )
          : Promise.resolve(null)
      );

      await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).toHaveBeenCalledWith(
        { lat: 10.487, lng: -66.892 },
        { lat: 10.49, lng: -66.89 },
        'MOTORCYCLE'
      );
    });

    it('reuses the cached route when the driver has not drifted significantly from the cached origin', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery()
      );
      const cachedOrigin = { lat: 10.487, lng: -66.892 };
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith('tracking:delivery:')) {
          return Promise.resolve(
            JSON.stringify({
              ...cachedOrigin,
              recordedAt: new Date().toISOString(),
            })
          );
        }
        if (key.startsWith('tracking:route:')) {
          return Promise.resolve(
            JSON.stringify({
              origin: cachedOrigin,
              route: {
                distanceMeters: 500,
                durationSeconds: 120,
                geometry: {},
                provider: 'osrm',
              },
            })
          );
        }
        return Promise.resolve(null);
      });

      const snapshot = await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).not.toHaveBeenCalled();
      expect(snapshot.route).toEqual(
        expect.objectContaining({ distanceMeters: 500, durationSeconds: 120 })
      );
    });

    it('recalculates the route when the driver drifted significantly from the cached origin', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery()
      );
      // ~1.1km away from the cached origin — well past ROUTE_RECALC_DISTANCE_METERS (100m)
      const currentLocation = { lat: 10.497, lng: -66.892 };
      const cachedOrigin = { lat: 10.487, lng: -66.892 };
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith('tracking:delivery:')) {
          return Promise.resolve(
            JSON.stringify({
              ...currentLocation,
              recordedAt: new Date().toISOString(),
            })
          );
        }
        if (key.startsWith('tracking:route:')) {
          return Promise.resolve(
            JSON.stringify({
              origin: cachedOrigin,
              route: {
                distanceMeters: 500,
                durationSeconds: 120,
                geometry: {},
                provider: 'osrm',
              },
            })
          );
        }
        return Promise.resolve(null);
      });

      const snapshot = await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).toHaveBeenCalledWith(
        currentLocation,
        { lat: 10.49, lng: -66.89 },
        'MOTORCYCLE'
      );
      expect(snapshot.route).toEqual(
        expect.objectContaining({ distanceMeters: 800 })
      );
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'tracking:route:delivery-1',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('skips routing when coordinates are missing', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery({ pickupLat: null, pickupLng: null })
      );

      const snapshot = await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).not.toHaveBeenCalled();
      expect(snapshot.route).toBeNull();
    });

    it('skips routing when no driver is assigned yet', async () => {
      mockPrismaService.delivery.findUniqueOrThrow.mockResolvedValue(
        baseDelivery({ driver: null })
      );

      const snapshot = await service.getSnapshot('delivery-1');

      expect(mockRoutingService.calculateRoute).not.toHaveBeenCalled();
      expect(snapshot.route).toBeNull();
    });
  });
});
