/**
 * Plugin color-mode (client-only)
 * Se ejecuta antes del primer render para aplicar el tema guardado
 * y evitar el flash de contenido sin estilo (FOUC).
 */
export default defineNuxtPlugin(() => {
  const stored = localStorage.getItem('color-mode')
  if (stored === 'dark') {
    document.documentElement.classList.add('dark')
  }
  // Inicializa el composable para sincronizar el ref reactivo
  useColorMode()
})
