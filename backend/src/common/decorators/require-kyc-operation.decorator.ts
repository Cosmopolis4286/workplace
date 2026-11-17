import { SetMetadata } from '@nestjs/common';
import { KycPolicyOperation } from '../../domains/platform/platform-settings/platform-settings.service';

export const KYC_POLICY_OPERATION = 'kyc:policy-operation';

export const RequireKycOperation = (operation: KycPolicyOperation) =>
  SetMetadata(KYC_POLICY_OPERATION, operation);
