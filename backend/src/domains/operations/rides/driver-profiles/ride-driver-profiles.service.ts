import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, RideDriverProfileStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../engagement/notifications/notifications.service';
import {
  ReviewRideDriverProfileDto,
  SubmitRideDriverProfileDto,
} from './ride-driver-profile.dto';

/**
 * Habilitación de conductores de corridas y envíos. Antes `corridas:manage`
 * venía con cualquier perfil profesional (un plomero podía aceptar
 * pasajeros) sin verificar vehículo ni licencia. Ahora el conductor declara
 * su vehículo y licencia, un admin lo aprueba, y solo así puede aceptar.
 */
@Injectable()
export class RideDriverProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  getMine(userId: string) {
    return this.prisma.rideDriverProfile.findUnique({ where: { userId } });
  }

  async submit(userId: string, dto: SubmitRideDriverProfileDto) {
    const existing = await this.getMine(userId);
    if (existing?.status === RideDriverProfileStatus.PENDING) {
      throw new ConflictException('Tu solicitud ya está en revisión');
    }
    const data = {
      vehicleType: dto.vehicleType,
      vehiclePlate: dto.vehiclePlate.toUpperCase().replace(/[\s-]/g, ''),
      vehicleModel: dto.vehicleModel.trim(),
      vehicleColor: dto.vehicleColor?.trim() || null,
      licenseNumber: dto.licenseNumber.toUpperCase().replace(/\s/g, ''),
      // Cambiar vehículo o licencia vuelve a revisión, aunque estuviera aprobado.
      status: RideDriverProfileStatus.PENDING,
      rejectionReason: null,
      reviewedById: null,
      reviewedAt: null,
    };
    return this.prisma.rideDriverProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  /** Para aceptar corridas: perfil aprobado y KYC aprobado. */
  async assertApprovedDriver(userId: string) {
    const profile = await this.getMine(userId);
    if (!profile || profile.status !== RideDriverProfileStatus.APPROVED) {
      throw new ForbiddenException(
        profile?.status === RideDriverProfileStatus.PENDING
          ? 'Tu perfil de conductor está en revisión'
          : 'Registra tu vehículo y licencia en "Conducir" para aceptar corridas'
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (user?.kycStatus !== KycStatus.APPROVED) {
      throw new ForbiddenException(
        'Verifica tu identidad (KYC) para aceptar corridas'
      );
    }
    return profile;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async list(status?: RideDriverProfileStatus) {
    const rows = await this.prisma.rideDriverProfile.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            kycStatus: true,
          },
        },
      },
    });
    return rows.map(({ user, ...p }) => ({
      ...p,
      userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      userEmail: user.email,
      userPhone: user.phone,
      kycStatus: user.kycStatus,
    }));
  }

  async review(adminId: string, id: string, dto: ReviewRideDriverProfileDto) {
    const profile = await this.prisma.rideDriverProfile.findUnique({
      where: { id },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!profile) throw new NotFoundException('Solicitud no encontrada');
    if (profile.status !== RideDriverProfileStatus.PENDING) {
      throw new ConflictException('Esta solicitud ya fue revisada');
    }
    const reason = dto.reason?.trim();
    if (dto.status === 'REJECTED' && (!reason || reason.length < 5)) {
      throw new BadRequestException('Explica por qué se rechaza');
    }
    if (
      dto.status === 'APPROVED' &&
      profile.user.kycStatus !== KycStatus.APPROVED
    ) {
      throw new BadRequestException(
        'El conductor debe tener su identidad verificada (KYC) antes de aprobarlo'
      );
    }
    const updated = await this.prisma.rideDriverProfile.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === 'REJECTED' ? reason : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    this.notifications
      .notifyRideDriverProfileReviewed(profile.userId, dto.status, reason)
      .catch(() => {});
    return updated;
  }
}
