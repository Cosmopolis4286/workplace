import { Capacitor } from '@capacitor/core'
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'

const LS_APP_LOCK = 'app_lock_enabled'

export function useBiometric() {
  const isNative = Capacitor.isNativePlatform()

  async function isAvailable(): Promise<boolean> {
    if (!isNative) return false
    try {
      const result = await BiometricAuth.checkBiometry()
      return result.isAvailable
    } catch {
      return false
    }
  }

  async function getBiometryType(): Promise<BiometryType> {
    if (!isNative) return BiometryType.none
    try {
      const result = await BiometricAuth.checkBiometry()
      return result.biometryType
    } catch {
      return BiometryType.none
    }
  }

  async function authenticate(reason = 'Verifica tu identidad para continuar'): Promise<boolean> {
    if (!isNative) return false
    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancelar',
        androidTitle: 'WorkPlace Manager',
        androidSubtitle: reason,
        allowDeviceCredential: true,
      })
      return true
    } catch {
      return false
    }
  }

  function isAppLockEnabled(): boolean {
    if (!process.client) return false
    return localStorage.getItem(LS_APP_LOCK) === 'true'
  }

  function setAppLockEnabled(enabled: boolean): void {
    if (!process.client) return
    if (enabled) {
      localStorage.setItem(LS_APP_LOCK, 'true')
    } else {
      localStorage.removeItem(LS_APP_LOCK)
    }
  }

  return {
    isNative,
    isAvailable,
    getBiometryType,
    authenticate,
    isAppLockEnabled,
    setAppLockEnabled,
  }
}
