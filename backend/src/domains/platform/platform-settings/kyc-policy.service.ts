import { Injectable } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
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
  enhancedReviewApproved?: boolean;
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
  constructor(private readonly settings: PlatformSettingsService) {}

  async getRequiredLevel(operation: KycPolicyOperation): Promise<KycLevel> {
    const settings = await this.settings.getAll();
    const policy = settings['identity.kycPolicy'] as
      typeof DEFAULT_KYC_PROGRESSIVE_POLICY | undefined;

    return (
      policy?.operations?.[operation] ??
      DEFAULT_KYC_PROGRESSIVE_POLICY.operations[operation]
    );
  }

  async evaluate(operation: KycPolicyOperation, subject: KycPolicySubject) {
    const requiredLevel = await this.getRequiredLevel(operation);
    const currentLevel = this.resolveSubjectLevel(subject);
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

  private resolveSubjectLevel(subject: KycPolicySubject): KycLevel {
    if (!subject.authenticated) {
      return 'PUBLIC';
    }

    if (
      subject.enhancedReviewApproved &&
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
        return 'Debes completar y obtener la aprobación de tu verificación de identidad (KYC).';
      case 'PHONE_VERIFIED':
        return 'Debes verificar tu número de teléfono antes de continuar.';
      case 'AUTHENTICATED':
        return current === 'PUBLIC'
          ? 'Debes iniciar sesión para continuar.'
          : 'No cumples los requisitos de identidad para esta operación.';
      default:
        return 'No cumples los requisitos de identidad para esta operación.';
    }
  }
}
