/**
 * useColorMode
 * - Estado global reactivo (singleton module-level ref)
 * - Persiste en localStorage bajo 'color-mode'
 * - Por defecto: modo claro
 * - Aplica/quita la clase 'dark' en <html> para Tailwind darkMode: 'class'
 * - SSR-safe: solo accede a DOM/localStorage en el cliente
 */

const isDark = ref(false)
let _initialized = false

function applyToDOM(dark: boolean) {
  if (!import.meta.client) return
  const html = document.documentElement
  html.classList.toggle('dark', dark)
  // Persiste preferencia
  localStorage.setItem('color-mode', dark ? 'dark' : 'light')
}

function init() {
  if (_initialized || !import.meta.client) return
  _initialized = true
  const stored = localStorage.getItem('color-mode')
  // Default: claro. Solo activa oscuro si fue guardado explícitamente.
  const preferDark = stored === 'dark'
  isDark.value = preferDark
  applyToDOM(preferDark)
}

export function useColorMode() {
  // Inicializa en primer uso del cliente
  if (import.meta.client) init()

  function toggle() {
    isDark.value = !isDark.value
    applyToDOM(isDark.value)
  }

  function setMode(dark: boolean) {
    isDark.value = dark
    applyToDOM(dark)
  }

  return {
    isDark: readonly(isDark),
    toggle,
    setMode,
  }
}
