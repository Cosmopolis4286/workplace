import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CorridaStatus, CorridaVehicleType, CorridaServiceType } from '@prisma/client';
import { CreateCorridaDto } from './dto/create-corrida.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { PlatformFeesService } from '../domains/money/platform-fees/platform-fees.service';

const PRICE_PER_KM: Record<CorridaVehicleType, number> = { MOTO: 8, AUTO: 12, CAMIONETA: 16, CAMION: 22 };
const BASE_FARE: Record<CorridaVehicleType, number> = { MOTO: 20, AUTO: 35, CAMIONETA: 60, CAMION: 90 };
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
  vehicleType: CorridaVehicleType,
) {
  const distance = Math.max(haversineKm(originLat, originLng, destLat, destLng), 0.5);
  const duration = Math.ceil((distance / AVG_SPEED_KMH) * 60);
  const price = parseFloat(
    (BASE_FARE[vehicleType] + distance * PRICE_PER_KM[vehicleType]).toFixed(2),
  );
  return { price, distance: parseFloat(distance.toFixed(2)), duration };
}

const CORRIDA_SELECT = {
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

function formatCorrida(c: any) {
  return {
    ...c,
    passengerName: c.passenger ? `${c.passenger.firstName} ${c.passenger.lastName}` : undefined,
    passengerPhone: c.passenger?.phone,
    driverName: c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : undefined,
    driverPhone: c.driver?.phone,
    passenger: undefined,
    driver: undefined,
  };
}

const ACTIVE_STATUSES: CorridaStatus[] = [
  CorridaStatus.PENDING,
  CorridaStatus.ACCEPTED,
  CorridaStatus.IN_PROGRESS,
];

const ALLOWED_TRANSITIONS: Partial<Record<CorridaStatus, CorridaStatus[]>> = {
  [CorridaStatus.ACCEPTED]: [CorridaStatus.IN_PROGRESS],
  [CorridaStatus.IN_PROGRESS]: [CorridaStatus.COMPLETED],
};

@Injectable()
export class CorridasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformFees: PlatformFeesService,
  ) {}

  calculatePrice(dto: CalculatePriceDto) {
    return calcPrice(dto.originLat, dto.originLng, dto.destinationLat, dto.destinationLng, dto.vehicleType);
  }

  async create(passengerId: string, dto: CreateCorridaDto) {
    const active = await this.prisma.corrida.findFirst({
      where: { passengerId, status: { in: ACTIVE_STATUSES } },
    });
    if (active) throw new BadRequestException('Ya tienes un viaje activo en progreso');

    const vehicleType = dto.vehicleType ?? CorridaVehicleType.MOTO;
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

    const corrida = await this.prisma.corrida.create({
      data: {
        serviceType: dto.serviceType ?? CorridaServiceType.PASAJERO,
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
      select: CORRIDA_SELECT,
    });
    return formatCorrida(corrida);
  }

  async findAvailable(serviceType?: CorridaServiceType) {
    const corridas = await this.prisma.corrida.findMany({
      where: { status: CorridaStatus.PENDING, ...(serviceType ? { serviceType } : {}) },
      orderBy: { createdAt: 'asc' },
      select: CORRIDA_SELECT,
    });
    return corridas.map(formatCorrida);
  }

  async findMine(passengerId: string) {
    const corridas = await this.prisma.corrida.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' },
      select: CORRIDA_SELECT,
    });
    return corridas.map(formatCorrida);
  }

  async findDriverCorridas(driverId: string) {
    const corridas = await this.prisma.corrida.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      select: CORRIDA_SELECT,
    });
    return corridas.map(formatCorrida);
  }

  async findOne(userId: string, corridaId: string) {
    const corrida = await this.prisma.corrida.findUnique({
      where: { id: corridaId },
      select: CORRIDA_SELECT,
    });
    if (!corrida) throw new NotFoundException('Corrida no encontrada');
    if (corrida.passengerId !== userId && corrida.driverId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta corrida');
    }
    return formatCorrida(corrida);
  }

  async accept(driverId: string, corridaId: string) {
    const corrida = await this.prisma.corrida.findUnique({ where: { id: corridaId } });
    if (!corrida) throw new NotFoundException('Corrida no encontrada');
    if (corrida.status !== CorridaStatus.PENDING) throw new BadRequestException('Esta corrida ya no está disponible');
    if (corrida.passengerId === driverId) throw new BadRequestException('No puedes aceptar tu propia corrida');

    const activeAsDriver = await this.prisma.corrida.findFirst({
      where: { driverId, status: { in: [CorridaStatus.ACCEPTED, CorridaStatus.IN_PROGRESS] } },
    });
    if (activeAsDriver) throw new BadRequestException('Ya tienes un viaje activo como conductor');

    const updated = await this.prisma.corrida.update({
      where: { id: corridaId },
      data: { status: CorridaStatus.ACCEPTED, driverId, acceptedAt: new Date() },
      select: CORRIDA_SELECT,
    });
    return formatCorrida(updated);
  }

  async updateStatus(userId: string, corridaId: string, status: CorridaStatus) {
    const corrida = await this.prisma.corrida.findUnique({ where: { id: corridaId } });
    if (!corrida) throw new NotFoundException('Corrida no encontrada');

    if (!(ALLOWED_TRANSITIONS[corrida.status] ?? []).includes(status)) {
      throw new BadRequestException(`No se puede cambiar de ${corrida.status} a ${status}`);
    }
    if (corrida.driverId !== userId) {
      throw new ForbiddenException('Solo el conductor asignado puede actualizar el estado');
    }

    const extra: Partial<{ startedAt: Date; completedAt: Date; platformFeeRate: number; platformFeeAmount: number; platformFeePayer: 'PROVIDER' }> = {};
    if (status === CorridaStatus.IN_PROGRESS) extra.startedAt = new Date();
    if (status === CorridaStatus.COMPLETED) {
      extra.completedAt = new Date();

      if (!corrida.platformFeePayer && corrida.price && corrida.driverId) {
        const feeConfig = await this.platformFees.resolveFeeConfig('CORRIDA', corrida.driverId);
        if (feeConfig?.payer === 'PROVIDER') {
          const { feeAmount } = this.platformFees.calculateFee(corrida.price, feeConfig);
          await this.platformFees.chargeProviderFee(
            'CORRIDA',
            corrida.driverId,
            feeAmount,
            `FEE-RIDE-${corridaId}`,
            { corridaId },
          );
          extra.platformFeeRate = feeConfig.rate;
          extra.platformFeeAmount = feeAmount;
          extra.platformFeePayer = 'PROVIDER';
        }
      }
    }

    const updated = await this.prisma.corrida.update({
      where: { id: corridaId },
      data: { status, ...extra },
      select: CORRIDA_SELECT,
    });
    return formatCorrida(updated);
  }

  async cancel(passengerId: string, corridaId: string) {
    const corrida = await this.prisma.corrida.findUnique({ where: { id: corridaId } });
    if (!corrida) throw new NotFoundException('Corrida no encontrada');
    if (corrida.passengerId !== passengerId) throw new ForbiddenException('No puedes cancelar esta corrida');
    if (corrida.status !== CorridaStatus.PENDING) throw new BadRequestException('Solo puedes cancelar corridas pendientes');

    const updated = await this.prisma.corrida.update({
      where: { id: corridaId },
      data: { status: CorridaStatus.CANCELLED, cancelledAt: new Date() },
      select: CORRIDA_SELECT,
    });
    return formatCorrida(updated);
  }
}
