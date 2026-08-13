/**
 * Envuelve `fn` en una versión debounced: cada llamada reinicia el temporizador,
 * `fn` solo se ejecuta `delay`ms después de la última invocación.
 * Expone `cancel()` para descartar una ejecución pendiente (ej. al limpiar un input).
 */
export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function debounced(...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }

  function cancel() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { debounced, cancel }
}
