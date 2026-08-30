// Envuelve la librería `qrcode` (ya usada en 2FA/backend y en download.vue)
// para generar el data URL de un QR client-side, sin depender de un
// endpoint nuevo — el QR solo codifica la URL pública que se le pase.
// Import dinámico: evita cargar la librería en páginas que nunca la usan.

export interface QrCodeOptions {
  width?: number
  margin?: number
  color?: { dark?: string; light?: string }
}

export function useQrCode() {
  async function generateQrDataUrl(text: string, options: QrCodeOptions = {}): Promise<string> {
    const QRCode = (await import('qrcode')).default
    return QRCode.toDataURL(text, {
      width: options.width ?? 200,
      margin: options.margin ?? 1,
      color: options.color ?? { dark: '#111827', light: '#ffffff' },
    })
  }

  return { generateQrDataUrl }
}
