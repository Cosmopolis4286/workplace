import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'

export default defineNuxtPlugin(async () => {
  // Solo ejecutar en dispositivo nativo
  if (!Capacitor.isNativePlatform()) {
    return
  }

  try {
    // Configurar StatusBar según el modo de color actual y sincronizar
    // con futuros cambios (toggle de modo oscuro en Configuración)
    const { isDark } = useColorMode()
    const syncStatusBar = async (dark: boolean) => {
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
      await StatusBar.setBackgroundColor({ color: dark ? '#030712' : '#ffffff' })
    }
    await syncStatusBar(isDark.value)
    watch(isDark, syncStatusBar)

    // Ocultar splash screen
    await SplashScreen.hide()

    // Manejar botón de retroceso en Android
    App.addListener('backButton', async ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp()
      } else {
        window.history.back()
      }
    })

    // Deep links (Android App Links): enlaces de https://playrke.com/reset-password
    // y /verify-email abren la app y navegan a la ruta correspondiente del SPA
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const { pathname, search } = new URL(url)
        navigateTo(`${pathname}${search}`)
      } catch (e) {
        console.error('❌ Error procesando deep link:', e)
      }
    })

    // Configurar teclado
    await Keyboard.addListener('keyboardDidShow', () => {
      document.body.classList.add('keyboard-open')
    })

    await Keyboard.addListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-open')
    })

    console.log('✅ Capacitor plugins inicializados correctamente')
  } catch (error) {
    console.error('❌ Error inicializando Capacitor:', error)
  }
})
