/**
 * Modo sin conexión básico.
 *
 * En El Triunfo y Sierra Imataca hay cortes de luz de 4–6 h y caídas de días
 * de la operadora móvil: la app tiene que seguir mostrando lo último que se
 * vio (catálogo, pedidos, pagos) y guardar acciones simples para enviarlas al
 * volver la señal.
 *
 * - Lecturas: las respuestas GET de las rutas de OFFLINE_READ_PREFIXES se
 *   guardan en localStorage por usuario; si la red falla, se devuelve la copia.
 * - Escrituras: solo las acciones idempotentes que se marcan como "encolables"
 *   (p. ej. marcar un pedido como entregado) se guardan y se reintentan.
 * - Todo se borra al cerrar sesión (clearOfflineData).
 */

const PREFIX = 'wp-offline:'
const OUTBOX_KEY = `${PREFIX}outbox`
// Una respuesta enorme no vale el espacio (localStorage ronda los 5 MB).
const MAX_ENTRY_BYTES = 300_000

/** Rutas GET que vale la pena tener sin señal (inicio de la URL, sin base). */
export const OFFLINE_READ_PREFIXES = [
  '/menu/products',
  '/menu/categories',
  '/orders',
  '/catalog/orders/mine',
  '/payments/manual/reports/incoming',
  '/services/requests/mine',
  '/cash',
]

export interface CachedRead<T = unknown> {
  at: string
  data: T
}

export interface OutboxItem {
  id: string
  userId: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  body: unknown
  createdAt: string
  label: string
}

const hasStorage = () => typeof localStorage !== 'undefined'

export function isOfflineReadable(url: string): boolean {
  const path = url.split('?')[0]
  return OFFLINE_READ_PREFIXES.some(p => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))
}

const readKey = (userId: string, url: string) => `${PREFIX}read:${userId}:${url}`

export function saveRead(userId: string, url: string, data: unknown): void {
  if (!hasStorage()) return
  try {
    const value = JSON.stringify({ at: new Date().toISOString(), data } satisfies CachedRead)
    if (value.length > MAX_ENTRY_BYTES) return
    localStorage.setItem(readKey(userId, url), value)
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando sin copia.
  }
}

export function loadRead<T>(userId: string, url: string): CachedRead<T> | null {
  if (!hasStorage()) return null
  try {
    const raw = localStorage.getItem(readKey(userId, url))
    return raw ? (JSON.parse(raw) as CachedRead<T>) : null
  } catch {
    return null
  }
}

export function loadOutbox(): OutboxItem[] {
  if (!hasStorage()) return []
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxItem[]
  } catch {
    return []
  }
}

export function saveOutbox(items: OutboxItem[]): void {
  if (!hasStorage()) return
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
  } catch {
    // Sin espacio: la acción queda solo en memoria hasta recargar.
  }
}

export function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt'>): OutboxItem {
  const full: OutboxItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  // La misma acción sobre el mismo recurso no se duplica.
  const rest = loadOutbox().filter(i => !(i.userId === item.userId && i.method === item.method && i.url === item.url))
  saveOutbox([...rest, full])
  return full
}

/** Borra copias y cola (al cerrar sesión: nada de un usuario queda para otro). */
export function clearOfflineData(): void {
  if (!hasStorage()) return
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // Ignorar: el almacenamiento no está disponible.
  }
}

/** Error de red (sin respuesta del servidor), no un error HTTP. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  const name = (err as { name?: string })?.name
  return name === 'TypeError' || name === 'NetworkError'
}
