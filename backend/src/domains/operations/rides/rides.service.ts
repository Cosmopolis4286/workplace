import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RideStatus, RideVehicleType, RideServiceType } from '@prisma/client';
import { CreateRideDto } from './dto/create-ride.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import {
  PlatformFeesFacade,
  PLATFORM_FEES_FACADE,
} from '../../money/platform-fees/platform-fees.facade';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { isPositive, toNumber } from '../../../common/money/money';
import { randomInt } from 'crypto';
import { RideDriverProfilesService } from './driver-profiles/ride-driver-profiles.service';

const PRICE_PER_KM: Record<RideVehicleType, number> = {
  MOTORCYCLE: 8,
  CAR: 12,
  PICKUP_TRUCK: 16,
  TRUCK: 22,
};
const BASE_FARE: Record<RideVehicleType, number> = {
  MOTORCYCLE: 20,
  CAR: 35,
  PICKUP_TRUCK: 60,
  TRUCK: 90,
};
const AVG_SPEED_KMH = 30;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcPrice(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  vehicleType: RideVehicleType
) {
  const distance = Math.max(
    haversineKm(originLat, originLng, destLat, destLng),
    0.5
  );
  const duration = Math.ceil((distance / AVG_SPEED_KMH) * 60);
  const price = parseFloat(
    (BASE_FARE[vehicleType] + distance * PRICE_PER_KM[vehicleType]).toFixed(2)
  );
  return { price, distance: parseFloat(distance.toFixed(2)), duration };
}

const RIDE_SELECT = {
  id: true,
  serviceType: true,
  origin: true,
  destination: true,
  originLat: true,
  originLng: true,
  destinationLat: true,
  destinationLng: true,
  status: true,
  vehicleType: true,
  price: true,
  distance: true,
  duration: true,
  notes: true,
  recipientName: true,
  recipientPhone: true,
  cargoDescription: true,
  cargoWeight: true,
  declaredValue: true,
  deliveryCode: true,
  cancelledById: true,
  cancelReason: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  passengerId: true,
  passenger: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
  driverId: true,
  driver: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} as const;

// hidePassengerContact: en findAvailable() el conductor todavía no aceptó el
// viaje — no debe ver el teléfono del pasajero hasta que exista una relación
// real (driverId asignado), igual que el resto del sistema solo revela
// contacto tras confirmar un trato.
// includeCode: el código de entrega de un envío solo lo ve el remitente
// (passenger); el conductor se lo pide al destinatario al entregar.
function formatRide(r: any, hidePassengerContact = false, includeCode = false) {
  const { deliveryCode, ...rest } = r;
  return {
    ...rest,
    ...(includeCode ? { deliveryCode } : {}),
    hasDeliveryCode: !!deliveryCode,
    passengerName: r.passenger
      ? `${r.passenger.firstName} ${r.passenger.lastName}`
      : undefined,
    passengerPhone: hidePassengerContact ? undefined : r.passenger?.phone,
    driverName: r.driver
      ? `${r.driver.firstName} ${r.driver.lastName}`
      : undefined,
    driverPhone: r.driver?.phone,
    passenger: undefined,
    driver: undefined,
  };
}

const ACTIVE_STATUSES: RideStatus[] = [
  RideStatus.PENDING,
  RideStatus.ACCEPTED,
  RideStatus.IN_PROGRESS,
];

const ALLOWED_TRANSITIONS: Partial<Record<RideStatus, RideStatus[]>> = {
  [RideStatus.ACCEPTED]: [RideStatus.IN_PROGRESS],
  [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
};

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_FEES_FACADE)
    private readonly platformFees: PlatformFeesFacade,
    private readonly notifications: NotificationsService,
    private readonly driverProfiles: RideDriverProfilesService
  ) {}

  calculatePrice(dto: CalculatePriceDto) {
    return calcPrice(
      dto.originLat,
      dto.originLng,
      dto.destinationLat,
      dto.destinationLng,
      dto.vehicleType
    );
  }

  async create(passengerId: string, dto: CreateRideDto) {
    const active = await this.prisma.ride.findFirst({
      where: { passengerId, status: { in: ACTIVE_STATUSES } },
    });
    if (active)
      throw new BadRequestException('Ya tienes un viaje activo en progreso');

    const serviceType = dto.serviceType ?? RideServiceType.PASSENGER;
    const isShipment = serviceType === RideServiceType.FREIGHT;
    if (
      isShipment &&
      (!dto.recipientName?.trim() || !dto.recipientPhone?.trim())
    ) {
      throw new BadRequestException(
        'Indica el nombre y el teléfono de quien recibe el envío'
      );
    }
    const vehicleType = dto.vehicleType ?? RideVehicleType.MOTORCYCLE;
    let price: number | undefined;
    let distance: number | undefined;
    let duration: number | undefined;

    if (
      dto.originLat != null &&
      dto.originLng != null &&
      dto.destinationLat != null &&
      dto.destinationLng != null
    ) {
      const est = calcPrice(
        dto.originLat,
        dto.originLng,
        dto.destinationLat,
        dto.destinationLng,
        vehicleType
      );
      price = est.price;
      distance = est.distance;
      duration = est.duration;
    }

    const feeConfig = await this.platformFees.resolveFeeConfig(
      'RIDE',
      passengerId
    );
    let platformFeeAmount: number | undefined;
    if (feeConfig?.payer === 'CLIENT' && price != null) {
      platformFeeAmount = this.platformFees.calculateFee(
        price,
        feeConfig
      ).feeAmount;
      price = Math.round((price + platformFeeAmount) * 100) / 100;
    }

    const ride = await this.prisma.ride.create({
      data: {
        serviceType,
        deliveryCode: isShipment
          ? String(randomInt(0, 10000)).padStart(4, '0')
          : undefined,
        origin: dto.origin,
        destination: dto.destination,
        originLat: dto.originLat,
        originLng: dto.originLng,
        destinationLat: dto.destinationLat,
        destinationLng: dto.destinationLng,
        vehicleType,
        notes: dto.notes,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        cargoDescription: dto.cargoDescription,
        cargoWeight: dto.cargoWeight,
        declaredValue: dto.declaredValue,
        price,
        distance,
        duration,
        passengerId,
        platformFeeRate:
          feeConfig?.payer === 'CLIENT' ? feeConfig.rate : undefined,
        platformFeeAmount:
          feeConfig?.payer === 'CLIENT' ? platformFeeAmount : undefined,
        platformFeePayer: feeConfig?.payer === 'CLIENT' ? 'CLIENT' : undefined,
      },
      select: RIDE_SELECT,
    });
    return formatRide(ride, false, true);
  }

  // Corridas pendientes para el conductor: solo si su perfil está aprobado,
  // y solo las de su tipo de vehículo.
  async findAvailable(driverId: string, serviceType?: RideServiceType) {
    const profile = await this.driverProfiles.getMine(driverId);
    if (profile?.status !== 'APPROVED') return [];
    const rides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.PENDING,
        vehicleType: profile.vehicleType,
        passengerId: { not: driverId },
        ...(serviceType ? { serviceType } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: RIDE_SELECT,
    });
    return rides.map((r) => formatRide(r, true));
  }

  async findMine(passengerId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' },
      select: RIDE_SELECT,
    });
    return rides.map((r) => formatRide(r, false, true));
  }

  async findDriverRides(driverId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      select: RIDE_SELECT,
    });
    return rides.map((r) => formatRide(r));
  }

  async findOne(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: RIDE_SELECT,
    });
    if (!ride) throw new NotFoundException('Corrida no encontrada');
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta corrida');
    }
    return formatRide(ride, false, ride.passengerId === userId);
  }

  async accept(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');
    if (ride.status !== RideStatus.PENDING)
      throw new BadRequestException('Esta corrida ya no está disponible');
    if (ride.passengerId === driverId)
      throw new BadRequestException('No puedes aceptar tu propia corrida');

    const profile = await this.driverProfiles.assertApprovedDriver(driverId);
    if (profile.vehicleType !== ride.vehicleType) {
      throw new BadRequestException(
        'Esta corrida pide otro tipo de vehículo que el registrado en tu perfil'
      );
    }

    const activeAsDriver = await this.prisma.ride.findFirst({
      where: {
        driverId,
        status: { in: [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] },
      },
    });
    if (activeAsDriver)
      throw new BadRequestException('Ya tienes un viaje activo como conductor');

    // Condicionado a PENDING: dos conductores no pueden quedarse con la misma.
    const claimed = await this.prisma.ride.updateMany({
      where: { id: rideId, status: RideStatus.PENDING },
      data: { status: RideStatus.ACCEPTED, driverId, acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Esta corrida ya no está disponible');
    }
    const updated = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      select: RIDE_SELECT,
    });
    const formatted = formatRide(updated);
    this.notifications
      .notifyRideAccepted(
        formatted.passengerId,
        formatted.driverName ?? 'El conductor'
      )
      .catch(() => {});
    return formatted;
  }

  async updateStatus(
    userId: string,
    rideId: string,
    status: RideStatus,
    deliveryCode?: string
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');

    if (!(ALLOWED_TRANSITIONS[ride.status] ?? []).includes(status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${ride.status} a ${status}`
      );
    }
    if (ride.driverId !== userId) {
      throw new ForbiddenException(
        'Solo el conductor asignado puede actualizar el estado'
      );
    }

    const extra: Partial<{
      startedAt: Date;
      completedAt: Date;
      platformFeeRate: number;
      platformFeeAmount: number;
      platformFeePayer: 'PROVIDER';
    }> = {};
    if (status === RideStatus.IN_PROGRESS) extra.startedAt = new Date();
    // Envío: entregar exige el código que el remitente le pasó al destinatario.
    if (
      status === RideStatus.COMPLETED &&
      ride.deliveryCode &&
      (deliveryCode ?? '').trim() !== ride.deliveryCode
    ) {
      throw new BadRequestException(
        'El código de entrega no coincide. Pídeselo a quien recibe el envío.'
      );
    }
    if (status === RideStatus.COMPLETED) {
      extra.completedAt = new Date();

      if (!ride.platformFeePayer && isPositive(ride.price) && ride.driverId) {
        const feeConfig = await this.platformFees.resolveFeeConfig(
          'RIDE',
          ride.driverId
        );
        if (feeConfig?.payer === 'PROVIDER') {
          const { feeAmount } = this.platformFees.calculateFee(
            ride.price,
            feeConfig
          );
          await this.platformFees.chargeProviderFee(
            'RIDE',
            ride.driverId,
            feeAmount,
            `FEE-RIDE-${rideId}`,
            { rideId }
          );
          extra.platformFeeRate = feeConfig.rate;
          extra.platformFeeAmount = feeAmount;
          extra.platformFeePayer = 'PROVIDER';
        }
      } else if (
        ride.platformFeePayer === 'CLIENT' &&
        isPositive(ride.platformFeeAmount) &&
        ride.driverId
      ) {
        // El pasajero pagó la comisión dentro del precio, directo al
        // conductor: el conductor la debe a la plataforma (estado de cuenta).
        await this.platformFees.chargeProviderFee(
          'RIDE',
          ride.driverId,
          toNumber(ride.platformFeeAmount),
          `FEE-RIDE-${rideId}`,
          { rideId, payer: 'CLIENT' }
        );
      }
    }

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status, ...extra },
      select: RIDE_SELECT,
    });
    const formatted = formatRide(updated);
    if (status === RideStatus.IN_PROGRESS || status === RideStatus.COMPLETED) {
      this.notifications
        .notifyRideStatusChanged(
          formatted.passengerId,
          formatted.driverName ?? 'El conductor',
          status
        )
        .catch(() => {});
    }
    return formatted;
  }

  // El pasajero/remitente cancela: libremente mientras está pendiente, y con
  // motivo una vez aceptada (se avisa al conductor). Ya en curso, no.
  async cancel(passengerId: string, rideId: string, reason?: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');
    if (ride.passengerId !== passengerId)
      throw new ForbiddenException('No puedes cancelar esta corrida');
    if (
      ride.status !== RideStatus.PENDING &&
      ride.status !== RideStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Solo se puede cancelar antes de que empiece el viaje'
      );
    }
    const trimmed = reason?.trim() || null;
    if (
      ride.status === RideStatus.ACCEPTED &&
      (!trimmed || trimmed.length < 5)
    ) {
      throw new BadRequestException(
        'El conductor ya va en camino: explica por qué cancelas'
      );
    }

    const changed = await this.prisma.ride.updateMany({
      where: { id: rideId, status: ride.status },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: passengerId,
        cancelReason: trimmed,
      },
    });
    if (changed.count !== 1) {
      throw new BadRequestException('La corrida cambió de estado; recarga');
    }
    const updated = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      select: RIDE_SELECT,
    });
    if (ride.driverId) {
      this.notifications
        .notifyRideCancelledByOther(
          ride.driverId,
          'El pasajero',
          trimmed,
          false
        )
        .catch(() => {});
    }
    return formatRide(updated, false, true);
  }

  /**
   * El conductor cancela una corrida aceptada que todavía no empezó. Si el
   * pasajero no apareció, la corrida se cancela; por cualquier otro motivo
   * vuelve a estar disponible para otro conductor. Antes no había forma: el
   * conductor quedaba bloqueado con "Ya tienes un viaje activo".
   */
  async driverCancel(
    driverId: string,
    rideId: string,
    dto: { reason: string; noShow?: boolean }
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.driverId !== driverId) {
      throw new NotFoundException('Corrida no encontrada');
    }
    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException(
        'Solo puedes cancelar una corrida aceptada que todavía no empezó'
      );
    }
    const reason = dto.reason?.trim() ?? '';
    if (reason.length < 5) {
      throw new BadRequestException('Explica por qué cancelas');
    }

    const data = dto.noShow
      ? {
          status: RideStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: driverId,
          cancelReason: `El pasajero no apareció: ${reason}`.slice(0, 300),
        }
      : {
          status: RideStatus.PENDING,
          driverId: null,
          acceptedAt: null,
        };
    const changed = await this.prisma.ride.updateMany({
      where: { id: rideId, status: RideStatus.ACCEPTED, driverId },
      data,
    });
    if (changed.count !== 1) {
      throw new BadRequestException('La corrida cambió de estado; recarga');
    }
    this.notifications
      .notifyRideCancelledByOther(
        ride.passengerId,
        'Tu conductor',
        reason,
        !dto.noShow
      )
      .catch(() => {});
    return { cancelled: !!dto.noShow, requeued: !dto.noShow };
  }
}
