import { Injectable } from '@nestjs/common';
import { EnhancedReviewStatus, KycStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_KYC_PROGRESSIVE_POLICY,
  KycLevel,
  KycPolicyOperation,
} from './platform-settings.service';
import { PlatformSettingsService } from './platform-settings.service';

export interface KycPolicySubject {
  authenticated: boolean;
  phoneVerified?: boolean;
  kycStatus?: KycStatus;
}

const LEVEL_RANK: Record<KycLevel, number> = {
  PUBLIC: 0,
  AUTHENTICATED: 1,
  PHONE_VERIFIED: 2,
  KYC_APPROVED: 3,
  ENHANCED_REVIEW: 4,
};

@Injectable()
export class KycPolicyService {
  constructor(
    private readonly settings: PlatformSettingsService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * La revisión reforzada se resuelve siempre desde la base de datos. Nunca
   * se consume un booleano de request.user, JWT ni del payload del cliente.
   */
  async getRequiredLevel(operation: KycPolicyOperation): Promise<KycLevel> {
    const settings = await this.settings.getAll();
    const policy = settings['identity.kycPolicy'] as
      | typeof DEFAULT_KYC_PROGRESSIVE_POLICY
      | undefined;

    return (
      policy?.operations?.[operation] ??
      DEFAULT_KYC_PROGRESSIVE_POLICY.operations[operation]
    );
  }

  async evaluate(
    operation: KycPolicyOperation,
    subject: KycPolicySubject
  ) {
    return this.evaluateWithReview(operation, subject, false);
  }

  /**
   * La revisión reforzada se resuelve siempre desde la base de datos. Nunca
   * se consume un booleano de request.user, JWT ni del payload del cliente.
   */
  async evaluateForUser(
    operation: KycPolicyOperation,
    subject: KycPolicySubject,
    userId?: string
  ) {
    if (!userId) return this.evaluate(operation, subject);

    const review = await this.prisma.enhancedReviewRequest.findUnique({
      where: { userId },
      select: { status: true, expiresAt: true },
    });
    const enhancedReviewApproved = Boolean(
      review?.status === EnhancedReviewStatus.APPROVED &&
        (!review.expiresAt || review.expiresAt > new Date())
    );

    return this.evaluateWithReview(operation, subject, enhancedReviewApproved);
  }

  private async evaluateWithReview(
    operation: KycPolicyOperation,
    subject: KycPolicySubject,
    enhancedReviewApproved: boolean
  ) {
    const requiredLevel = await this.getRequiredLevel(operation);
    const currentLevel = this.resolveSubjectLevel(
      subject,
      enhancedReviewApproved
    );
    const allowed = LEVEL_RANK[currentLevel] >= LEVEL_RANK[requiredLevel];

    const reason = allowed
      ? null
      : this.getDenialReason(requiredLevel, currentLevel);

    return {
      operation,
      allowed,
      requiredLevel,
      currentLevel,
      reason,
    };
  }

  private resolveSubjectLevel(
    subject: KycPolicySubject,
    enhancedReviewApproved: boolean
  ): KycLevel {
    if (!subject.authenticated) {
      return 'PUBLIC';
    }

    if (
      enhancedReviewApproved &&
      subject.kycStatus === KycStatus.APPROVED
    ) {
      return 'ENHANCED_REVIEW';
    }

    if (subject.kycStatus === KycStatus.APPROVED) {
      return 'KYC_APPROVED';
    }

    if (subject.phoneVerified) {
      return 'PHONE_VERIFIED';
    }

    return 'AUTHENTICATED';
  }

  private getDenialReason(required: KycLevel, current: KycLevel): string {
    switch (required) {
      case 'ENHANCED_REVIEW':
        return 'Esta operación requiere una revisión reforzada por parte de administración.';
      case 'KYC_APPROVED':
        return (
          'Debes completar y obtener la aprobación de tu verificación de identidad (KYC).'
        );
      case 'PHONE_VERIFIED':
        return (
          'Debes verificar tu número de teléfono (en Mi perfil) antes de continuar.'
        );
      case 'AUTHENTICATED':
        return current === 'PUBLIC'
          ? 'Debes iniciar sesión para continuar.'
          : 'No cumples los requisitos de identidad para esta operación.';
      default:
        return 'No cumples los requisitos de identidad para esta operación.';
    }
  }
}
