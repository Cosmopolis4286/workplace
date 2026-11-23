import { useQrCode } from '../core/useQrCode'

export interface StatusHighlight {
  name: string
  price: string
}

/**
 * Imagen vertical (1080×1920, formato de estado de WhatsApp / historia de
 * Instagram) con el nombre de la tienda, hasta 3 productos con precio y el QR
 * al enlace. Solo texto y QR: sin fotos de productos (evita problemas de CORS
 * y mantiene la imagen liviana para compartir con datos móviles).
 */
export function useStoreStatusImage() {
  const { generateQrDataUrl } = useQrCode()

  function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  // roundRect no existe en WebViews viejos de Android (gama baja): rectángulo normal.
  function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r)
    else ctx.rect(x, y, w, h)
    ctx.fill()
  }

  function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    if (ctx.measureText(text).width <= maxWidth) return text
    let t = text
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
    return `${t}…`
  }

  async function generate(opts: { title: string; url: string; highlights: StatusHighlight[] }) {
    const W = 1080
    const H = 1920
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Fondo con el rojo de la marca.
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#dc2626')
    bg.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText('Pide en WorkPlace', W / 2, 170)
    ctx.font = 'bold 84px sans-serif'
    ctx.fillText(fitText(ctx, opts.title, W - 120), W / 2, 290)

    // Tarjeta blanca con productos.
    const cardY = 360
    const items = opts.highlights.slice(0, 3)
    const cardH = 120 + items.length * 130
    ctx.fillStyle = '#ffffff'
    roundedRect(ctx, 80, cardY, W - 160, cardH, 40)
    ctx.textAlign = 'left'
    items.forEach((item, i) => {
      const y = cardY + 110 + i * 130
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 50px sans-serif'
      ctx.fillText(fitText(ctx, item.name, W - 520), 140, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 50px sans-serif'
      ctx.fillText(item.price, W - 140, y)
      ctx.textAlign = 'left'
    })

    // QR al enlace de la tienda.
    const qrSize = 560
    const qrY = cardY + cardH + 90
    const qr = await loadImage(await generateQrDataUrl(opts.url, { width: qrSize, margin: 2 }))
    ctx.fillStyle = '#ffffff'
    roundedRect(ctx, (W - qrSize) / 2 - 30, qrY - 30, qrSize + 60, qrSize + 60, 40)
    ctx.drawImage(qr, (W - qrSize) / 2, qrY, qrSize, qrSize)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 46px sans-serif'
    ctx.fillText('Escanea y haz tu pedido', W / 2, qrY + qrSize + 120)
    ctx.font = '34px sans-serif'
    ctx.fillText(fitText(ctx, opts.url.replace(/^https?:\/\//, ''), W - 120), W / 2, qrY + qrSize + 180)
    ctx.font = '32px sans-serif'
    ctx.fillText('Pago Móvil · efectivo al recibir', W / 2, H - 90)

    return canvas.toDataURL('image/png')
  }

  return { generate }
}
