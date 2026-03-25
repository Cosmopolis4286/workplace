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
    // Configurar StatusBar
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#ffffff' })

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
