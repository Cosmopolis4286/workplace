import { VehicleType } from '@prisma/client';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  // GeoJSON LineString coordinates ([lng, lat][]) — formato que Leaflet
  // consume directamente vía L.geoJSON / L.polyline con swap de coords.
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  provider: string;
}

// Contrato que cualquier proveedor de ruteo debe cumplir. DeliveryService /
// TrackingService dependen solo de esto — nunca de OSRM, Google u otro
// proveedor concreto (ver RoutingService, que decide cuál usar).
export interface RoutingProvider {
  readonly name: string;
  calculateRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    vehicleType: VehicleType
  ): Promise<RouteResult>;
}
