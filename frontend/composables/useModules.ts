/**
 * useModules — provides the effective module list for the current user.
 *
 * effectiveModules = Plan.enabledModules ∩ UserCategory.allowedModules
 *
 * SUPERADMIN/ADMIN/NORMAL get all modules (backend returns ALL_MODULES).
 * COMMERCE/FREELANCER get the intersection of their plan and business category.
 *
 * Usage:
 *   const { hasModule, effectiveModules } = useModules()
 *   if (hasModule('analytics')) { ... }
 */

import { ref, computed } from 'vue'

const effectiveModules = ref<string[]>([])
const loaded = ref(false)

export function useModules() {
  const config = useRuntimeConfig()
  const { getHeaders, user } = useAuth()

  async function loadModules() {
    if (loaded.value) return
    try {
      const res = await fetch(`${config.public.apiUrl}/plans/usage`, {
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.limits?.effectiveModules) {
        effectiveModules.value = data.limits.effectiveModules
        loaded.value = true
      }
    } catch {
      // fallback: show nothing blocked
    }
  }

  function hasModule(module: string): boolean {
    // SUPERADMIN/ADMIN/NORMAL no tienen restricciones de plan/categoría (commerce es null)
    const role = user.value?.role
    const unrestricted = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'NORMAL'
    if (unrestricted) return true
    // COMMERCE/FREELANCER: mientras no haya cargado el plan, denegar (evita "flash" de módulos no permitidos)
    if (!loaded.value) return false
    return effectiveModules.value.includes(module)
  }

  function invalidate() {
    loaded.value = false
    effectiveModules.value = []
  }

  return {
    effectiveModules: computed(() => effectiveModules.value),
    loaded: computed(() => loaded.value),
    hasModule,
    loadModules,
    invalidate,
  }
}
