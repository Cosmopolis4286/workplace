/**
 * useRecaptcha — integración de Google reCAPTCHA v3 (invisible).
 *
 * Uso:
 *   const { executeRecaptcha, isLoaded } = useRecaptcha()
 *   const token = await executeRecaptcha('login')
 *   // enviar token al backend para verificación
 *
 * La site key se lee de NUXT_PUBLIC_RECAPTCHA_SITE_KEY.
 * Si no está configurada (desarrollo) se omite la carga del script y
 * executeRecaptcha devuelve un string vacío.
 */

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const SCRIPT_ID = 'google-recaptcha-v3'
let loadPromise: Promise<void> | null = null

function loadScript(siteKey: string): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Error al cargar reCAPTCHA'))
    document.head.appendChild(script)
  })

  return loadPromise
}

export function useRecaptcha() {
  const config = useRuntimeConfig()
  const siteKey = config.public.recaptchaSiteKey as string | undefined
  const isLoaded = ref(false)
  const isEnabled = computed(() => !!siteKey)

  onMounted(async () => {
    if (!siteKey) return
    try {
      await loadScript(siteKey)
      await new Promise<void>(resolve => window.grecaptcha.ready(resolve))
      isLoaded.value = true
    } catch (e) {
      console.warn('[reCAPTCHA] No se pudo cargar:', e)
    }
  })

  async function executeRecaptcha(action: string): Promise<string> {
    if (!siteKey || !isLoaded.value) return ''
    return window.grecaptcha.execute(siteKey, { action })
  }

  return { executeRecaptcha, isLoaded, isEnabled }
}
