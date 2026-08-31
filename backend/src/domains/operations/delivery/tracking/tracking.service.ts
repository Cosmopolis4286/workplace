import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RedisService } from '../../../../redis/redis.service';
import { RoutingService } from '../routing/routing.service';
import { haversineDistanceMeters } from '../routing/routing.service';
import { UpdateLocationDto } from './dto/update-location.dto';

// Estados en los que un repartidor puede estar transmitiendo GPS en vivo.
// Fuera de este rango (PENDING, DELIVERED, CANCELLED, FAILED) no hay nada
// que trackear — ver syncTrackingActive, llamado desde
// DeliveryService.updateDeliveryStatus/assignDriver.
const TRACKABLE_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKING_UP,
  DeliveryStatus.IN_TRANSIT,
];

// TTL del último snapshot de ubicación en Redis. No es histórico — es el
// "último visto", con expiración corta para que una entrega abandonada
// (app cerrada, sin conexión) deje de reportar posición por sí sola.
const LOCATION_TTL_SECONDS = 120;

// No emitir/persistir un update si el repartidor se movió menos de esto
// desde la última posición conocida y no pasó suficiente tiempo — evita
// spamear WS/DB con GPS jitter estacionario.
const MIN_DISTANCE_METERS = 15;
const MIN_INTERVAL_MS = 4000;

export interface LocationSnapshot {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

export interface TrackingSnapshot {
  deliveryId: string;
  status: DeliveryStatus;
  trackingActive: boolean;
  driver: {
    id: string;
    name: string;
    vehicleType: string;
    phone: string | null;
  } | null;
  location: LocationSnapshot | null;
  pickup: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  route: {
    distanceMeters: number;
    durationSeconds: number;
    geometry: unknown;
    provider: string;
  } | null;
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly routing: RoutingService
  ) {}

  // ─── Vista del repartidor ───────────────────────────────────────────────
  // Entregas activas asignadas al Driver vinculado a este usuario. No exige
  // trackingActive=true (ASSIGNED recién asignada también debe verse, para
  // que el repartidor pueda actuar) — solo excluye estados terminales.
  async findMyActiveDeliveries(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) return [];

    return this.prisma.delivery.findMany({
      where: {
        driverId: driver.id,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKING_UP, DeliveryStatus.IN_TRANSIT] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Autorización ───────────────────────────────────────────────────────
  // Único punto de verdad de "quién puede ver el tracking de esta entrega":
  // el cliente dueño (customerUserId), el driver asignado (driver.userId),
  // o cualquier usuario del comercio dueño de la entrega. Usado tanto por
  // el gateway WS (al hacer join) como por el endpoint REST de fetch inicial.
  async assertCanView(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        driver: { select: { userId: true } },
        commerce: { select: { userId: true } },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    const isCustomer = delivery.customerUserId === userId;
    const isDriver = delivery.driver?.userId === userId;
    const isCommerceOwner = delivery.commerce.userId === userId;

    if (!isCustomer && !isDriver && !isCommerceOwner) {
      throw new ForbiddenException('No autorizado para ver esta entrega');
    }

    return delivery;
  }

  // Solo el driver asignado puede publicar su propia posición.
  private async assertCanPublish(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { driver: { select: { id: true, userId: true } } },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');
    if (!delivery.driver || delivery.driver.userId !== userId) {
      throw new ForbiddenException('No autorizado para publicar ubicación en esta entrega');
    }
    if (!delivery.trackingActive) {
      throw new ForbiddenException('El tracking de esta entrega no está activo');
    }
    return delivery;
  }

  // ─── Activación/desactivación según estado ─────────────────────────────
  // Llamado desde DeliveryService cada vez que cambia el estado o se asigna
  // driver. Idempotente: solo escribe si el valor realmente cambia.
  async syncTrackingActive(deliveryId: string, status: DeliveryStatus): Promise<boolean> {
    const shouldBeActive = TRACKABLE_STATUSES.includes(status);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { trackingActive: true },
    });
    if (!delivery || delivery.trackingActive === shouldBeActive) return shouldBeActive;

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { trackingActive: shouldBeActive },
    });

    if (!shouldBeActive) {
      await this.redis.del(this.locationKey(deliveryId));
    }

    return shouldBeActive;
  }

  // ─── Ubicación ──────────────────────────────────────────────────────────

  async publishLocation(
    deliveryId: string,
    userId: string,
    dto: UpdateLocationDto
  ): Promise<{ delivery: Awaited<ReturnType<typeof this.assertCanPublish>>; accepted: boolean; snapshot: LocationSnapshot }> {
    const delivery = await this.assertCanPublish(deliveryId, userId);

    const previous = await this.getLastLocation(deliveryId);
    const now = Date.now();
    const snapshot: LocationSnapshot = {
      lat: dto.lat,
      lng: dto.lng,
      accuracy: dto.accuracy,
      heading: dto.heading,
      speed: dto.speed,
      recordedAt: new Date(now).toISOString(),
    };

    let accepted = true;
    if (previous) {
      const movedMeters = haversineDistanceMeters(previous, dto);
      const elapsedMs = now - new Date(previous.recordedAt).getTime();
      accepted = movedMeters >= MIN_DISTANCE_METERS || elapsedMs >= MIN_INTERVAL_MS;
    }

    if (!accepted) {
      return { delivery, accepted, snapshot: previous! };
    }

    await this.redis.setex(this.locationKey(deliveryId), LOCATION_TTL_SECONDS, JSON.stringify(snapshot));

    await this.prisma.driver.update({
      where: { id: delivery.driver!.id },
      data: {
        currentLat: dto.lat,
        currentLng: dto.lng,
        currentHeading: dto.heading,
        currentSpeed: dto.speed,
        locationUpdatedAt: new Date(now),
      },
    });

    return { delivery, accepted, snapshot };
  }

  private async getLastLocation(deliveryId: string): Promise<LocationSnapshot | null> {
    const raw = await this.redis.get(this.locationKey(deliveryId));
    if (!raw) return null;
    return JSON.parse(raw) as LocationSnapshot;
  }

  private locationKey(deliveryId: string) {
    return `tracking:delivery:${deliveryId}`;
  }

  // ─── Snapshot completo (fetch inicial antes de conectar el WS) ─────────

  async getSnapshot(deliveryId: string): Promise<TrackingSnapshot> {
    const delivery = await this.prisma.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: {
        driver: {
          select: { id: true, name: true, vehicleType: true, phone: true },
        },
      },
    });

    const location = await this.getLastLocation(deliveryId);

    let route: TrackingSnapshot['route'] = null;
    const hasCoords =
      delivery.pickupLat != null &&
      delivery.pickupLng != null &&
      delivery.destLat != null &&
      delivery.destLng != null;

    if (hasCoords && delivery.driver) {
      const origin = location
        ? { lat: location.lat, lng: location.lng }
        : { lat: delivery.pickupLat!, lng: delivery.pickupLng! };
      const result = await this.routing.calculateRoute(
        origin,
        { lat: delivery.destLat!, lng: delivery.destLng! },
        delivery.driver.vehicleType
      );
      route = result;
    }

    return {
      deliveryId,
      status: delivery.status,
      trackingActive: delivery.trackingActive,
      driver: delivery.driver,
      location,
      pickup:
        delivery.pickupLat != null && delivery.pickupLng != null
          ? { lat: delivery.pickupLat, lng: delivery.pickupLng }
          : null,
      destination:
        delivery.destLat != null && delivery.destLng != null
          ? { lat: delivery.destLat, lng: delivery.destLng }
          : null,
      route,
    };
  }
}
