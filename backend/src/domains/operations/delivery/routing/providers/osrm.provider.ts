import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { VehicleType } from '@prisma/client';
import { RoutePoint, RouteResult, RoutingProvider } from '../routing.types';

// OSRM expone perfiles fijos por instancia (driving/cycling/foot), no un
// enum por vehículo. La demo pública (router.project-osrm.org) solo sirve
// 'driving' — en producción, un OSRM propio con múltiples perfiles permite
// mapear MOTORCYCLE/CAR/SCOOTER a 'driving' real y BICYCLE a 'cycling'.
const VEHICLE_TO_OSRM_PROFILE: Record<VehicleType, string> = {
  MOTORCYCLE: 'driving',
  CAR: 'driving',
  SCOOTER: 'driving',
  BICYCLE: 'cycling',
  ELECTRIC_BICYCLE: 'cycling',
  ON_FOOT: 'foot',
};

@Injectable()
export class OsrmProvider implements RoutingProvider {
  readonly name = 'osrm';
  private readonly logger = new Logger(OsrmProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'OSRM_BASE_URL',
      'https://router.project-osrm.org'
    );
  }

  async calculateRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    vehicleType: VehicleType
  ): Promise<RouteResult> {
    const profile = VEHICLE_TO_OSRM_PROFILE[vehicleType] ?? 'driving';
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${this.baseUrl}/route/v1/${profile}/${coords}`;

    try {
      const { data } = await axios.get(url, {
        params: { overview: 'full', geometries: 'geojson' },
        timeout: 8000,
      });

      const route = data?.routes?.[0];
      if (!route) {
        throw new ServiceUnavailableException('OSRM no devolvió ninguna ruta');
      }

      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: route.geometry,
        provider: this.name,
      };
    } catch (err) {
      this.logger.warn(`OSRM request failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('No se pudo calcular la ruta (OSRM)');
    }
  }
}
