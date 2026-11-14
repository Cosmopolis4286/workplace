import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Recarga en vivo en el celular (equivalente a Expo Go): con CAP_SERVER_URL,
 * la APK de depuración carga la app desde tu `pnpm dev` en vez de los
 * archivos empaquetados, y conserva las funciones nativas (push, cámara,
 * GPS). Ver frontend/docs/CAPACITOR_APK_BUILD.md, sección "Recarga en vivo".
 *
 *   CAP_SERVER_URL=http://192.168.1.50:3000 npx cap sync android
 *
 * Sin la variable se genera la configuración normal (archivos empaquetados).
 * Antes de compilar una APK para distribuir, vuelve a correr
 * `npx cap sync android` SIN la variable: si no, la APK seguiría apuntando
 * a tu PC.
 */
function devServer(): CapacitorConfig['server'] {
  const raw = process.env.CAP_SERVER_URL?.trim();
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`CAP_SERVER_URL no es una URL válida: "${raw}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('CAP_SERVER_URL debe empezar con http:// o https://');
  }

  console.warn(
    `\n⚠️  Modo recarga en vivo: la APK cargará la app desde ${url.origin}.\n` +
      '   Para una APK de distribución, vuelve a correr `npx cap sync android` sin CAP_SERVER_URL.\n'
  );
  return {
    url: url.origin,
    // El dev server es http en la red local: Android bloquea http salvo que
    // se permita explícitamente. Solo en este modo.
    cleartext: url.protocol === 'http:',
  };
}

const live = devServer();

const config: CapacitorConfig = {
  appId: 'com.workplace.app',
  appName: 'WorkPlace',
  webDir: '.output/public',
  server: live ?? {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      // El plugin no tiene `spinnerStyle` (se ignoraba): son opciones por plataforma.
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      spinnerColor: "#999999",
    }
  }
};

export default config;
