import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleType } from '@prisma/client';
import { OsrmProvider } from './providers/osrm.provider';
import { RoutePoint, RouteResult, RoutingProvider } from './routing.types';

// Velocidad promedio asumida por vehículo para el fallback en línea recta
// (m/s) — solo se usa si el proveedor de ruteo configurado falla, para que
// el cliente igual vea una distancia/ETA aproximados en vez de un error.
const FALLBACK_SPEED_MPS: Record<VehicleType, number> = {
  MOTORCYCLE: 8.3, // ~30 km/h
  CAR: 8.3,
  SCOOTER: 6.9, // ~25 km/h
  BICYCLE: 4.2, // ~15 km/h
  ELECTRIC_BICYCLE: 5.6, // ~20 km/h
  ON_FOOT: 1.4, // ~5 km/h
};

// Delivery/Tracking dependen únicamente de calculateRoute() — nunca conocen
// si la ruta vino de OSRM, Google u otro proveedor (ver routing.types.ts).
// ROUTING_PRIMARY selecciona el proveedor activo; hoy solo existe 'osrm',
// pero el switch está preparado para sumar 'google' como fallback futuro
// sin tocar ningún consumidor.
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly primary: RoutingProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly osrmProvider: OsrmProvider
  ) {
    const primaryName = this.config.get<string>('ROUTING_PRIMARY', 'osrm');
    this.primary = this.resolveProvider(primaryName);
  }

  private resolveProvider(name: string): RoutingProvider {
    switch (name) {
      case 'osrm':
      default:
        return this.osrmProvider;
    }
  }

  async calculateRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    vehicleType: VehicleType
  ): Promise<RouteResult> {
    try {
      return await this.primary.calculateRoute(origin, destination, vehicleType);
    } catch (err) {
      this.logger.warn(
        `Provider "${this.primary.name}" failed, using straight-line fallback: ${(err as Error).message}`
      );
      return this.straightLineFallback(origin, destination, vehicleType);
    }
  }

  private straightLineFallback(
    origin: RoutePoint,
    destination: RoutePoint,
    vehicleType: VehicleType
  ): RouteResult {
    const distanceMeters = haversineDistanceMeters(origin, destination);
    const speed = FALLBACK_SPEED_MPS[vehicleType] ?? FALLBACK_SPEED_MPS.MOTORCYCLE;
    return {
      distanceMeters,
      durationSeconds: distanceMeters / speed,
      geometry: {
        type: 'LineString',
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
      },
      provider: 'straight-line-fallback',
    };
  }
}

// Fórmula de Haversine — distancia en metros entre dos puntos lat/lng.
export function haversineDistanceMeters(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000; // radio terrestre en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
