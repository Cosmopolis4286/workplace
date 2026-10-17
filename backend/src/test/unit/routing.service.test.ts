import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RoutingService } from '../../domains/operations/delivery/routing/routing.service';
import { OsrmProvider } from '../../domains/operations/delivery/routing/providers/osrm.provider';

describe('RoutingService', () => {
  let service: RoutingService;
  let mockOsrmProvider: { name: string; calculateRoute: jest.Mock };

  beforeEach(async () => {
    mockOsrmProvider = {
      name: 'osrm',
      calculateRoute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key, fallback) => fallback) },
        },
        { provide: OsrmProvider, useValue: mockOsrmProvider },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
  });

  const origin = { lat: 10.4806, lng: -66.9036 }; // Caracas
  const destination = { lat: 10.4906, lng: -66.8936 };

  it('delegates to the configured provider and returns its result', async () => {
    mockOsrmProvider.calculateRoute.mockResolvedValue({
      distanceMeters: 1500,
      durationSeconds: 300,
      geometry: { type: 'LineString', coordinates: [] },
      provider: 'osrm',
    });

    const result = await service.calculateRoute(
      origin,
      destination,
      'MOTORCYCLE'
    );

    expect(mockOsrmProvider.calculateRoute).toHaveBeenCalledWith(
      origin,
      destination,
      'MOTORCYCLE'
    );
    expect(result.provider).toBe('osrm');
    expect(result.distanceMeters).toBe(1500);
  });

  it('falls back to a straight-line estimate when the provider fails', async () => {
    mockOsrmProvider.calculateRoute.mockRejectedValue(
      new Error('OSRM unreachable')
    );

    const result = await service.calculateRoute(
      origin,
      destination,
      'MOTORCYCLE'
    );

    expect(result.provider).toBe('straight-line-fallback');
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.geometry.coordinates).toEqual([
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ]);
  });

  it('fallback duration scales with vehicle speed (bicycle slower than car)', async () => {
    mockOsrmProvider.calculateRoute.mockRejectedValue(
      new Error('OSRM unreachable')
    );

    const carResult = await service.calculateRoute(origin, destination, 'CAR');
    const bikeResult = await service.calculateRoute(
      origin,
      destination,
      'BICYCLE'
    );

    expect(bikeResult.durationSeconds).toBeGreaterThan(
      carResult.durationSeconds
    );
  });

  it('fallback distance is a reasonable straight-line approximation (~1.2km for this pair)', async () => {
    mockOsrmProvider.calculateRoute.mockRejectedValue(
      new Error('OSRM unreachable')
    );

    const result = await service.calculateRoute(
      origin,
      destination,
      'MOTORCYCLE'
    );

    expect(result.distanceMeters).toBeGreaterThan(500);
    expect(result.distanceMeters).toBeLessThan(3000);
  });
});
