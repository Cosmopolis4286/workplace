import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RideStatus, RideVehicleType, RideServiceType } from '@prisma/client';
import { CreateRideDto } from './dto/create-ride.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { PlatformFeesService } from '../domains/money/platform-fees/platform-fees.service';

const PRICE_PER_KM: Record<RideVehicleType, number> = { MOTORCYCLE: 8, CAR: 12, PICKUP_TRUCK: 16, TRUCK: 22 };
const BASE_FARE: Record<RideVehicleType, number> = { MOTORCYCLE: 20, CAR: 35, PICKUP_TRUCK: 60, TRUCK: 90 };
const AVG_SPEED_KMH = 30;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  vehicleType: RideVehicleType,
) {
  const distance = Math.max(haversineKm(originLat, originLng, destLat, destLng), 0.5);
  const duration = Math.ceil((distance / AVG_SPEED_KMH) * 60);
  const price = parseFloat(
    (BASE_FARE[vehicleType] + distance * PRICE_PER_KM[vehicleType]).toFixed(2),
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
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  passengerId: true,
  passenger: { select: { id: true, firstName: true, lastName: true, phone: true } },
  driverId: true,
  driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
} as const;

function formatRide(r: any) {
  return {
    ...r,
    passengerName: r.passenger ? `${r.passenger.firstName} ${r.passenger.lastName}` : undefined,
    passengerPhone: r.passenger?.phone,
    driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : undefined,
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
    private readonly platformFees: PlatformFeesService,
  ) {}

  calculatePrice(dto: CalculatePriceDto) {
    return calcPrice(dto.originLat, dto.originLng, dto.destinationLat, dto.destinationLng, dto.vehicleType);
  }

  async create(passengerId: string, dto: CreateRideDto) {
    const active = await this.prisma.ride.findFirst({
      where: { passengerId, status: { in: ACTIVE_STATUSES } },
    });
    if (active) throw new BadRequestException('Ya tienes un viaje activo en progreso');

    const vehicleType = dto.vehicleType ?? RideVehicleType.MOTORCYCLE;
    let price: number | undefined;
    let distance: number | undefined;
    let duration: number | undefined;

    if (dto.originLat != null && dto.originLng != null && dto.destinationLat != null && dto.destinationLng != null) {
      const est = calcPrice(dto.originLat, dto.originLng, dto.destinationLat, dto.destinationLng, vehicleType);
      price = est.price;
      distance = est.distance;
      duration = est.duration;
    }

    const feeConfig = await this.platformFees.resolveFeeConfig('CORRIDA', passengerId);
    let platformFeeAmount: number | undefined;
    if (feeConfig?.payer === 'CLIENT' && price != null) {
      platformFeeAmount = this.platformFees.calculateFee(price, feeConfig).feeAmount;
      price = Math.round((price + platformFeeAmount) * 100) / 100;
    }

    const ride = await this.prisma.ride.create({
      data: {
        serviceType: dto.serviceType ?? RideServiceType.PASSENGER,
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
        platformFeeRate: feeConfig?.payer === 'CLIENT' ? feeConfig.rate : undefined,
        platformFeeAmount: feeConfig?.payer === 'CLIENT' ? platformFeeAmount : undefined,
        platformFeePayer: feeConfig?.payer === 'CLIENT' ? 'CLIENT' : undefined,
      },
      select: RIDE_SELECT,
    });
    return formatRide(ride);
  }

  async findAvailable(serviceType?: RideServiceType) {
    const rides = await this.prisma.ride.findMany({
      where: { status: RideStatus.PENDING, ...(serviceType ? { serviceType } : {}) },
      orderBy: { createdAt: 'asc' },
      select: RIDE_SELECT,
    });
    return rides.map(formatRide);
  }

  async findMine(passengerId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' },
      select: RIDE_SELECT,
    });
    return rides.map(formatRide);
  }

  async findDriverRides(driverId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      select: RIDE_SELECT,
    });
    return rides.map(formatRide);
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
    return formatRide(ride);
  }

  async accept(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');
    if (ride.status !== RideStatus.PENDING) throw new BadRequestException('Esta corrida ya no está disponible');
    if (ride.passengerId === driverId) throw new BadRequestException('No puedes aceptar tu propia corrida');

    const activeAsDriver = await this.prisma.ride.findFirst({
      where: { driverId, status: { in: [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] } },
    });
    if (activeAsDriver) throw new BadRequestException('Ya tienes un viaje activo como conductor');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.ACCEPTED, driverId, acceptedAt: new Date() },
      select: RIDE_SELECT,
    });
    return formatRide(updated);
  }

  async updateStatus(userId: string, rideId: string, status: RideStatus) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');

    if (!(ALLOWED_TRANSITIONS[ride.status] ?? []).includes(status)) {
      throw new BadRequestException(`No se puede cambiar de ${ride.status} a ${status}`);
    }
    if (ride.driverId !== userId) {
      throw new ForbiddenException('Solo el conductor asignado puede actualizar el estado');
    }

    const extra: Partial<{ startedAt: Date; completedAt: Date; platformFeeRate: number; platformFeeAmount: number; platformFeePayer: 'PROVIDER' }> = {};
    if (status === RideStatus.IN_PROGRESS) extra.startedAt = new Date();
    if (status === RideStatus.COMPLETED) {
      extra.completedAt = new Date();

      if (!ride.platformFeePayer && ride.price && ride.driverId) {
        const feeConfig = await this.platformFees.resolveFeeConfig('CORRIDA', ride.driverId);
        if (feeConfig?.payer === 'PROVIDER') {
          const { feeAmount } = this.platformFees.calculateFee(ride.price, feeConfig);
          await this.platformFees.chargeProviderFee(
            'CORRIDA',
            ride.driverId,
            feeAmount,
            `FEE-RIDE-${rideId}`,
            { rideId },
          );
          extra.platformFeeRate = feeConfig.rate;
          extra.platformFeeAmount = feeAmount;
          extra.platformFeePayer = 'PROVIDER';
        }
      }
    }

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status, ...extra },
      select: RIDE_SELECT,
    });
    return formatRide(updated);
  }

  async cancel(passengerId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Corrida no encontrada');
    if (ride.passengerId !== passengerId) throw new ForbiddenException('No puedes cancelar esta corrida');
    if (ride.status !== RideStatus.PENDING) throw new BadRequestException('Solo puedes cancelar corridas pendientes');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.CANCELLED, cancelledAt: new Date() },
      select: RIDE_SELECT,
    });
    return formatRide(updated);
  }
}
