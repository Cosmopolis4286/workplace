import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
} from '../dto/update-settings.dto';

/**
 * Contrato para los settings que ambos tipos de cuenta soportan.
 * `updateRestaurantInfo`/`updateOperationSettings` no están acá porque son
 * exclusivos de COMMERCE — forzarlos aquí obligaría a un throw artificial
 * en la implementación de FREELANCER; se manejan en SettingsService (ver
 * comentario ahí) hasta que exista el guard @RequireAccountType compartido
 * con menu.service.ts.
 */
export interface SettingsAccountStrategy {
  getSettings(userId: string): Promise<{ restaurant: unknown; settings: unknown }>;
  updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto): Promise<unknown>;
  updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto): Promise<unknown>;
  getModuleSettings(userId: string, availableModules: string[]): Promise<{ availableModules: string[]; disabledModules: string[] }>;
  updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto): Promise<unknown>;
}
