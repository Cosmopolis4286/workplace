import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
  UpdateLocationDto,
} from '../dto/update-settings.dto';

/**
 * Contrato para los settings que ambos tipos de cuenta soportan.
 * `updateCommerceInfo`/`updateOperationSettings` no están acá porque son
 * operan sobre el Commerce — forzarlos aquí obligaría a un throw artificial
 * en la implementación de FREELANCER; se manejan en SettingsService,
 * protegidos por @RequireCapability('HAS_COMMERCE') en el controller.
 */
export interface SettingsAccountStrategy {
  getSettings(
    userId: string
  ): Promise<{ commerce: unknown; settings: unknown }>;
  updatePaymentSettings(
    userId: string,
    dto: UpdatePaymentSettingsDto
  ): Promise<unknown>;
  updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto
  ): Promise<unknown>;
  getModuleSettings(
    userId: string,
    availableModules: string[]
  ): Promise<{ availableModules: string[]; disabledModules: string[] }>;
  updateModuleSettings(
    userId: string,
    dto: UpdateModuleSettingsDto
  ): Promise<unknown>;
  updateLocation(userId: string, dto: UpdateLocationDto): Promise<unknown>;
}
