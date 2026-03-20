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
  const { getHeaders } = useAuth()

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
    // If not loaded yet (SUPERADMIN/ADMIN path where commerce is null), allow all
    if (!loaded.value || effectiveModules.value.length === 0) return true
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
